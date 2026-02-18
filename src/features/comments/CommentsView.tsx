import { type ReactNode, useState } from 'react';
import { TextArea } from 'devextreme-react/text-area';
import { Button } from 'devextreme-react/button';
import { useComments } from '@/hooks/useComments';
import { useAuthStore } from '@/lib/auth-store';
import type { CommentTarget } from '@/types';
import './CommentsView.css';

interface CommentsViewProps {
  projectId: string;
  targetType?: CommentTarget;
  targetId?: string;
}

export default function CommentsView({
  projectId,
  targetType = 'project',
  targetId,
}: CommentsViewProps): ReactNode {
  const { comments, loading, error, addComment, deleteComment } = useComments(
    projectId,
    targetType,
    targetId,
  );
  const profile = useAuthStore((s) => s.profile);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await addComment(newMessage.trim());
      setNewMessage('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: { event?: { key: string; ctrlKey: boolean } }) => {
    if (e.event?.key === 'Enter' && e.event?.ctrlKey) {
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
          <div className="comment-input-wrapper">
            <TextArea
              value={newMessage}
              onValueChanged={(e) => setNewMessage(e.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a comment... (Ctrl+Enter to send)"
              stylingMode="outlined"
              height={80}
            />
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
                  {comment.created_by === profile?.user_id && (
                    <button
                      className="comment-delete-btn"
                      onClick={() => deleteComment(comment.id)}
                      title="Delete comment"
                    >
                      <i className="dx-icon-trash" />
                    </button>
                  )}
                </div>
                <div className="comment-message">{comment.message}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
