import { type ReactNode, useState, useRef, useCallback } from 'react';
import { TextArea } from 'devextreme-react/text-area';
import { Button } from 'devextreme-react/button';
import { useComments } from '@/hooks/useComments';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import { useAuthStore } from '@/lib/auth-store';
import type { CommentTarget } from '@/types';
import './CommentsView.css';

interface CommentsViewProps {
  projectId: string;
  targetType?: CommentTarget;
  targetId?: string;
}

interface MentionCandidate {
  user_id: string;
  display: string;
}

function renderMessage(message: string): ReactNode {
  const parts = message.split(/(@\S+)/g);
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="mention">{part}</span>
    ) : (
      part
    ),
  );
}

export default function CommentsView({
  projectId,
  targetType = 'project',
  targetId,
}: CommentsViewProps): ReactNode {
  const { comments, loading, error, addComment, updateComment, deleteComment } = useComments(
    projectId,
    targetType,
    targetId,
  );
  const { members } = useProjectMembers(projectId);
  const profile = useAuthStore((s) => s.profile);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Mention state
  const [mentionedIds, setMentionedIds] = useState<Set<string>>(new Set());
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const textAreaRef = useRef<HTMLDivElement>(null);

  // Build candidate list from project members
  const candidates: MentionCandidate[] = members.map((m) => ({
    user_id: m.user_id,
    display: m.profile?.full_name || m.profile?.email || m.user_id,
  }));

  const filtered = mentionQuery !== null
    ? candidates.filter((c) =>
        c.display.toLowerCase().includes(mentionQuery.toLowerCase()),
      )
    : [];

  // Get the native textarea element from DevExtreme TextArea
  const getTextarea = useCallback((): HTMLTextAreaElement | null => {
    return textAreaRef.current?.querySelector('textarea') ?? null;
  }, []);

  // Detect @ mention from cursor position
  const detectMention = useCallback((text: string) => {
    const ta = getTextarea();
    if (!ta) return;
    const pos = ta.selectionStart;

    // Walk backwards from cursor to find @
    let atPos = -1;
    for (let i = pos - 1; i >= 0; i--) {
      const ch = text[i];
      if (ch === '@') {
        // Valid @ trigger: at start or preceded by whitespace
        if (i === 0 || /\s/.test(text[i - 1])) {
          atPos = i;
        }
        break;
      }
      if (/\s/.test(ch)) break;
    }

    if (atPos >= 0) {
      const query = text.slice(atPos + 1, pos);
      setMentionQuery(query);
      setMentionStartPos(atPos);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  }, [getTextarea]);

  const handleValueChanged = useCallback((e: { value?: string }) => {
    const val = e.value ?? '';
    setNewMessage(val);
    // Use requestAnimationFrame to read cursor position after DOM update
    requestAnimationFrame(() => {
      detectMention(val);
    });
  }, [detectMention]);

  const insertMention = useCallback(
    (candidate: MentionCandidate) => {
      const ta = getTextarea();
      const text = newMessage;
      // Replace @query with @DisplayName (+ trailing space)
      const before = text.slice(0, mentionStartPos);
      const cursorPos = ta ? ta.selectionStart : mentionStartPos + 1 + (mentionQuery?.length || 0);
      const after = text.slice(cursorPos);
      const mentionText = `@${candidate.display} `;
      const updated = before + mentionText + after;
      setNewMessage(updated);
      setMentionedIds((prev) => new Set(prev).add(candidate.user_id));
      setMentionQuery(null);

      // Restore cursor position after React re-render
      const newCursorPos = before.length + mentionText.length;
      requestAnimationFrame(() => {
        if (ta) {
          ta.focus();
          ta.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
    },
    [getTextarea, mentionStartPos, mentionQuery, newMessage],
  );

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await addComment(newMessage.trim(), Array.from(mentionedIds));
      setNewMessage('');
      setMentionedIds(new Set());
      setMentionQuery(null);
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSending(false);
    }
  };

  const handleStartEdit = (commentId: string, message: string) => {
    setEditingId(commentId);
    setEditMessage(message);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditMessage('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editMessage.trim()) return;
    setSaving(true);
    try {
      await updateComment(editingId, editMessage.trim());
      setEditingId(null);
      setEditMessage('');
    } catch (err) {
      console.error('Failed to update comment:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: { event?: { key: string; ctrlKey: boolean; preventDefault?: () => void } }) => {
    const ev = e.event;
    if (!ev) return;

    // When mention dropdown is open, handle navigation keys
    if (mentionQuery !== null && filtered.length > 0) {
      if (ev.key === 'ArrowDown') {
        ev.preventDefault?.();
        setMentionIndex((prev) => (prev + 1) % filtered.length);
        return;
      }
      if (ev.key === 'ArrowUp') {
        ev.preventDefault?.();
        setMentionIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
        return;
      }
      if (ev.key === 'Enter') {
        ev.preventDefault?.();
        insertMention(filtered[mentionIndex]);
        return;
      }
      if (ev.key === 'Escape') {
        ev.preventDefault?.();
        setMentionQuery(null);
        return;
      }
    }

    // Normal Ctrl+Enter to send
    if (ev.key === 'Enter' && ev.ctrlKey) {
      handleSend();
    }
  };

  if (loading && comments.length === 0) {
    return (
      <div className="comments-loading">
        <div className="loading-spinner" />
        <p>Loading comments...</p>
      </div>
    );
  }

  return (
    <div className="comments-view">
      <div className="comment-input-section">
        <div className="comment-input-row">
          <div className="comment-avatar">
            {(profile?.full_name || profile?.email || '?')[0].toUpperCase()}
          </div>
          <div className="comment-input-wrapper" ref={textAreaRef}>
            <div className="mention-container">
              <TextArea
                value={newMessage}
                onValueChanged={handleValueChanged}
                valueChangeEvent="input"
                onKeyDown={handleKeyDown}
                placeholder="Write a comment... (Ctrl+Enter to send, @ to mention)"
                stylingMode="outlined"
                height={80}
              />
              {mentionQuery !== null && filtered.length > 0 && (
                <div className="mention-dropdown">
                  {filtered.map((c, i) => (
                    <div
                      key={c.user_id}
                      className={`mention-item${i === mentionIndex ? ' active' : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault(); // prevent textarea blur
                        insertMention(c);
                      }}
                      onMouseEnter={() => setMentionIndex(i)}
                    >
                      <span className="mention-item-avatar">
                        {c.display[0].toUpperCase()}
                      </span>
                      <span className="mention-item-name">{c.display}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="comment-input-actions">
              <Button
                text={sending ? 'Sending...' : 'Send'}
                type="default"
                stylingMode="contained"
                icon="send"
                disabled={!newMessage.trim() || sending}
                onClick={handleSend}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="comments-error">
          <i className="dx-icon-warning" />
          <span>{error}</span>
        </div>
      )}

      <div className="comments-list">
        {comments.length === 0 ? (
          <div className="comments-empty">
            <i className="dx-icon-comment" />
            <p>No comments yet. Be the first to add one.</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="comment-item">
              <div className="comment-avatar">
                {(comment.author_name || comment.author_email || '?')[0].toUpperCase()}
              </div>
              <div className="comment-body">
                <div className="comment-header">
                  <span className="comment-author">
                    {comment.author_name || comment.author_email || 'Unknown'}
                  </span>
                  <span className="comment-time">
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                  {comment.created_by === profile?.user_id && editingId !== comment.id && (
                    <>
                      <Button
                        icon="edit"
                        stylingMode="text"
                        hint="Edit comment"
                        className="comment-edit-btn"
                        onClick={() => handleStartEdit(comment.id, comment.message)}
                      />
                      <Button
                        icon="trash"
                        stylingMode="text"
                        hint="Delete comment"
                        className="comment-delete-btn"
                        onClick={() => deleteComment(comment.id)}
                      />
                    </>
                  )}
                </div>
                {editingId === comment.id ? (
                  <div className="comment-edit-area">
                    <TextArea
                      value={editMessage}
                      onValueChanged={(e) => setEditMessage(e.value ?? '')}
                      valueChangeEvent="input"
                      stylingMode="outlined"
                      height={80}
                      onKeyDown={(e) => {
                        if (e.event?.key === 'Enter' && e.event?.ctrlKey) handleSaveEdit();
                        if (e.event?.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    <div className="comment-edit-actions">
                      <Button
                        text="Cancel"
                        stylingMode="text"
                        onClick={handleCancelEdit}
                      />
                      <Button
                        text={saving ? 'Saving...' : 'Save'}
                        type="default"
                        stylingMode="contained"
                        disabled={!editMessage.trim() || saving}
                        onClick={handleSaveEdit}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="comment-message">{renderMessage(comment.message)}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
