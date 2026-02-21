import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { TextBox } from 'devextreme-react/text-box';
import { ColorBox } from 'devextreme-react/color-box';
import { Button } from 'devextreme-react/button';
import { useAuthStore } from '@/lib/auth-store';
import { useEnumConfigStore } from '@/lib/enum-config-store';
import type { EnumCategory, EnumOption } from '@/types';
import './EnumConfigSection.css';

interface CategoryMeta {
  key: EnumCategory;
  label: string;
  allowAdd: boolean;
}

const CATEGORIES: CategoryMeta[] = [
  { key: 'task_status', label: 'Task Status', allowAdd: true },
  { key: 'project_status', label: 'Project Status', allowAdd: true },
  { key: 'department', label: 'Department', allowAdd: true },
  { key: 'user_role', label: 'User Role', allowAdd: false },
  { key: 'member_permission', label: 'Member Permission', allowAdd: false },
  { key: 'item_type', label: 'Item Type', allowAdd: false },
  { key: 'link_type', label: 'Link Type', allowAdd: false },
];

export default function EnumConfigSection(): ReactNode {
  const tenantId = useAuthStore((s) => s.profile?.tenant_id);
  const getOptions = useEnumConfigStore((s) => s.getOptions);
  const updateOptions = useEnumConfigStore((s) => s.updateOptions);

  const [activeCategory, setActiveCategory] = useState<EnumCategory>('task_status');
  const [editOptions, setEditOptions] = useState<EnumOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const activeMeta = CATEGORIES.find((c) => c.key === activeCategory)!;

  // Load options when category changes
  useEffect(() => {
    setEditOptions(getOptions(activeCategory).map((o) => ({ ...o })));
    setSaved(false);
  }, [activeCategory, getOptions]);

  const handleLabelChange = useCallback((index: number, label: string) => {
    setEditOptions((prev) => prev.map((o, i) => (i === index ? { ...o, label } : o)));
  }, []);

  const handleColorChange = useCallback((index: number, color: string | null) => {
    setEditOptions((prev) => prev.map((o, i) => (i === index ? { ...o, color } : o)));
  }, []);

  const handleValueChange = useCallback((index: number, value: string) => {
    setEditOptions((prev) => prev.map((o, i) => (i === index ? { ...o, value } : o)));
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setEditOptions((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((o, i) => ({ ...o, sort_order: i }));
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setEditOptions((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((o, i) => ({ ...o, sort_order: i }));
    });
  }, []);

  const handleAdd = useCallback(() => {
    setEditOptions((prev) => [
      ...prev,
      {
        value: '',
        label: '',
        color: '#94a3b8',
        icon: null,
        sort_order: prev.length,
        is_system: false,
      },
    ]);
  }, []);

  const handleDelete = useCallback((index: number) => {
    setEditOptions((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((o, i) => ({ ...o, sort_order: i })),
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!tenantId) return;
    // Validate: all values must be non-empty and unique
    const values = editOptions.map((o) => o.value.trim());
    if (values.some((v) => !v)) {
      alert('All values must be non-empty.');
      return;
    }
    if (new Set(values).size !== values.length) {
      alert('All values must be unique.');
      return;
    }
    setSaving(true);
    setSaved(false);
    try {
      const cleaned = editOptions.map((o, i) => ({
        ...o,
        value: o.value.trim(),
        label: o.label.trim() || o.value.trim(),
        sort_order: i,
      }));
      await updateOptions(tenantId, activeCategory, cleaned);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save enum config:', err);
      alert('Failed to save. Check console for details.');
    } finally {
      setSaving(false);
    }
  }, [tenantId, activeCategory, editOptions, updateOptions]);

  return (
    <div className="enum-config-section">
      <div className="enum-config-sidebar">
        {CATEGORIES.map((cat) => (
          <div
            key={cat.key}
            className={`enum-config-sidebar-item ${activeCategory === cat.key ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setActiveCategory(cat.key)}
          >
            {cat.label}
          </div>
        ))}
      </div>

      <div className="enum-config-editor">
        <div className="enum-config-editor-header">
          <h3>{activeMeta.label}</h3>
          {activeMeta.allowAdd && (
            <Button icon="plus" text="Add" stylingMode="outlined" onClick={handleAdd} />
          )}
        </div>

        <div className="enum-config-list">
          <div className="enum-config-list-header">
            <span className="enum-col-order">#</span>
            <span className="enum-col-value">Value</span>
            <span className="enum-col-label">Label</span>
            <span className="enum-col-color">Color</span>
            <span className="enum-col-actions">Actions</span>
          </div>
          {editOptions.map((opt, index) => (
            <div key={index} className="enum-config-row">
              <span className="enum-col-order">{index + 1}</span>
              <div className="enum-col-value">
                {opt.is_system ? (
                  <span
                    className="enum-value-readonly"
                    style={{ backgroundColor: opt.color || '#94a3b8' }}
                  >
                    {opt.value}
                  </span>
                ) : (
                  <TextBox
                    value={opt.value}
                    onValueChanged={(e) => handleValueChange(index, e.value)}
                    stylingMode="outlined"
                    placeholder="value_key"
                  />
                )}
              </div>
              <div className="enum-col-label">
                <TextBox
                  value={opt.label}
                  onValueChanged={(e) => handleLabelChange(index, e.value)}
                  stylingMode="outlined"
                  placeholder="Display Label"
                />
              </div>
              <div className="enum-col-color">
                <ColorBox
                  value={opt.color ?? null}
                  onValueChanged={(e) => handleColorChange(index, e.value || null)}
                  stylingMode="outlined"
                />
              </div>
              <div className="enum-col-actions">
                <Button
                  icon="arrowup"
                  stylingMode="text"
                  hint="Move up"
                  disabled={index === 0}
                  onClick={() => handleMoveUp(index)}
                />
                <Button
                  icon="arrowdown"
                  stylingMode="text"
                  hint="Move down"
                  disabled={index === editOptions.length - 1}
                  onClick={() => handleMoveDown(index)}
                />
                {!opt.is_system && activeMeta.allowAdd && (
                  <Button
                    icon="trash"
                    stylingMode="text"
                    hint="Delete"
                    onClick={() => handleDelete(index)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="enum-config-footer">
          <Button
            text={saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            type={saved ? 'success' : 'default'}
            stylingMode="contained"
            icon={saved ? 'check' : ''}
            disabled={saving}
            onClick={handleSave}
          />
        </div>
      </div>
    </div>
  );
}
