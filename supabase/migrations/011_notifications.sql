-- =============================================
-- 011_notifications.sql
-- Notification system: table, RLS, RPC, triggers
-- Run in Supabase SQL Editor
-- =============================================

-- 1) Notification type enum
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('assignment', 'comment_mention', 'status_change', 'due_date');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  user_id       uuid NOT NULL REFERENCES auth.users(id),
  type          notification_type NOT NULL,
  title         text NOT NULL,
  message       text,
  target_type   text,            -- 'project_item', 'project', 'comment'
  target_id     uuid,
  project_id    uuid REFERENCES projects(id),
  is_read       boolean NOT NULL DEFAULT false,
  read_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

-- 4) RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System inserts only (via triggers / SECURITY DEFINER functions)
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- 5) RPC: mark single notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE id = p_notification_id
    AND user_id = auth.uid()
    AND is_read = false;
END;
$$;
GRANT EXECUTE ON FUNCTION mark_notification_read(uuid) TO authenticated;

-- 6) RPC: mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE user_id = auth.uid()
    AND is_read = false;
END;
$$;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated;

-- 7) Trigger: notify on task assignment
CREATE OR REPLACE FUNCTION notify_on_assignment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item_name text;
  v_project_id uuid;
  v_tenant_id uuid;
BEGIN
  -- Don't notify if user assigns to themselves
  IF NEW.user_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  SELECT name, project_id, tenant_id
  INTO v_item_name, v_project_id, v_tenant_id
  FROM project_items WHERE id = NEW.item_id;

  INSERT INTO notifications (tenant_id, user_id, type, title, message, target_type, target_id, project_id)
  VALUES (
    v_tenant_id,
    NEW.user_id,
    'assignment',
    'New Assignment',
    'You were assigned to "' || COALESCE(v_item_name, 'Unknown') || '"',
    'project_item',
    NEW.item_id,
    v_project_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_assignment ON task_assignees;
CREATE TRIGGER trg_notify_on_assignment
  AFTER INSERT ON task_assignees
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_assignment();

-- 8) Trigger: notify on comment mention
CREATE OR REPLACE FUNCTION notify_on_comment_mention()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_mentioned_id uuid;
  v_tenant_id uuid;
BEGIN
  v_tenant_id := NEW.tenant_id;

  IF NEW.mentioned_user_ids IS NOT NULL AND array_length(NEW.mentioned_user_ids, 1) > 0 THEN
    FOREACH v_mentioned_id IN ARRAY NEW.mentioned_user_ids
    LOOP
      -- Don't notify the commenter
      IF v_mentioned_id != COALESCE(NEW.created_by, auth.uid()) THEN
        INSERT INTO notifications (tenant_id, user_id, type, title, message, target_type, target_id, project_id)
        VALUES (
          v_tenant_id,
          v_mentioned_id,
          'comment_mention',
          'Mentioned in Comment',
          left(NEW.message, 100),
          'comment',
          NEW.id,
          NEW.project_id
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_comment_mention ON comments;
CREATE TRIGGER trg_notify_on_comment_mention
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_comment_mention();
