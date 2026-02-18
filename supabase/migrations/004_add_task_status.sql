-- =============================================
-- 004: Add task_status column to project_items
-- project_items의 태스크 상태를 정식 enum 컬럼으로 관리
-- 기존 custom_fields.board_status 데이터를 마이그레이션
-- =============================================

-- 1. task_status enum 생성
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. project_items에 task_status 컬럼 추가
ALTER TABLE public.project_items
  ADD COLUMN IF NOT EXISTS task_status task_status NOT NULL DEFAULT 'todo';

-- 3. 기존 custom_fields.board_status 데이터 마이그레이션
UPDATE public.project_items
SET task_status = CASE
  WHEN custom_fields->>'board_status' = 'in_progress' THEN 'in_progress'::task_status
  WHEN custom_fields->>'board_status' = 'review'      THEN 'review'::task_status
  WHEN custom_fields->>'board_status' = 'done'         THEN 'done'::task_status
  ELSE 'todo'::task_status
END
WHERE item_type = 'task';

-- 4. custom_fields에서 board_status 키 제거
UPDATE public.project_items
SET custom_fields = custom_fields - 'board_status'
WHERE custom_fields ? 'board_status';

-- 5. 인덱스 추가 (프로젝트별 상태 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_project_items_status
  ON public.project_items(project_id, task_status)
  WHERE item_type = 'task';
