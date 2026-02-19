import { type ReactNode } from 'react';
import CommentsView from '@/features/comments/CommentsView';

interface CommentsTabProps {
  projectId: string;
  itemId: string;
}

export default function CommentsTab({ projectId, itemId }: CommentsTabProps): ReactNode {
  return (
    <div className="tab-comments">
      <CommentsView projectId={projectId} targetType="item" targetId={itemId} />
    </div>
  );
}
