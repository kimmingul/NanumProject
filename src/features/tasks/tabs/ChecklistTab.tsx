import { type ReactNode, useCallback, useState } from 'react';
import { CheckBox } from 'devextreme-react/check-box';
import { TextBox } from 'devextreme-react/text-box';
import { Button } from 'devextreme-react/button';
import { useChecklist } from '@/hooks/useChecklist';

interface ChecklistTabProps {
  itemId: string;
}

export default function ChecklistTab({ itemId }: ChecklistTabProps): ReactNode {
  const [newItemText, setNewItemText] = useState('');
  const { items: checklistItems, loading, addItem, deleteItem, toggleItem } =
    useChecklist(itemId);

  const handleAdd = useCallback(async () => {
    if (!newItemText.trim()) return;
    try {
      await addItem(newItemText.trim());
      setNewItemText('');
    } catch (err) {
      console.error('Failed to add checklist item:', err);
    }
  }, [newItemText, addItem]);

  const handleKeyDown = (e: { event?: { key: string } }) => {
    if (e.event?.key === 'Enter') {
      handleAdd();
    }
  };

  const completedCount = checklistItems.filter((i) => i.is_completed).length;
  const totalCount = checklistItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="tab-checklist">
      <div className="checklist-section">
        <div className="checklist-header">
          <h4>Checklist</h4>
          <span className="checklist-progress-text">
            {completedCount} of {totalCount} completed
          </span>
        </div>

        {totalCount > 0 && (
          <div className="checklist-progress-bar">
            <div
              className="checklist-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {loading ? (
          <div className="checklist-loading">Loading checklist...</div>
        ) : (
          <div className="checklist-items">
            {checklistItems.map((item) => (
              <div key={item.id} className="checklist-item">
                <CheckBox
                  value={item.is_completed}
                  onValueChanged={() => toggleItem(item)}
                />
                <span className={`checklist-item-text ${item.is_completed ? 'completed' : ''}`}>
                  {item.name}
                </span>
                <Button
                  icon="trash"
                  stylingMode="text"
                  hint="Delete"
                  className="checklist-delete-btn"
                  onClick={() => deleteItem(item.id)}
                />
              </div>
            ))}
          </div>
        )}

        <div className="checklist-add-row">
          <TextBox
            value={newItemText}
            onValueChanged={(e) => setNewItemText(e.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a checklist item..."
            stylingMode="outlined"
          />
          <Button
            icon="add"
            stylingMode="outlined"
            onClick={handleAdd}
            disabled={!newItemText.trim()}
            hint="Add item"
          />
        </div>
      </div>
    </div>
  );
}
