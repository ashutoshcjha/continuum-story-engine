import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';

interface InlineEditProps {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function InlineEdit({
  value,
  onCommit,
  placeholder = 'Double-click to add',
  multiline = false,
  className = '',
  ariaLabel,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const controlRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    const control = controlRef.current;
    control?.focus();
    if (control) control.setSelectionRange(control.value.length, control.value.length);
  }, [isEditing]);

  const beginEditing = (event?: MouseEvent<HTMLElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    setDraft(value);
    setIsEditing(true);
  };

  const commit = () => {
    if (!isEditing) return;
    const nextValue = draft.trim();
    setIsEditing(false);
    if (nextValue !== value) onCommit(nextValue);
  };

  const cancel = () => {
    setDraft(value);
    setIsEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
      return;
    }
    if ((!multiline && event.key === 'Enter') || (multiline && event.key === 'Enter' && (event.metaKey || event.ctrlKey))) {
      event.preventDefault();
      commit();
    }
  };

  if (isEditing) {
    const commonProps = {
      ref: controlRef as never,
      className: 'inline-edit-control',
      value: draft,
      'aria-label': ariaLabel ?? placeholder,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(event.target.value),
      onBlur: commit,
      onKeyDown: handleKeyDown,
      onClick: (event: MouseEvent<HTMLElement>) => event.stopPropagation(),
      onDoubleClick: (event: MouseEvent<HTMLElement>) => event.stopPropagation(),
    };

    return (
      <span className={`inline-edit is-editing ${multiline ? 'is-multiline' : ''} ${className}`.trim()}>
        {multiline ? <textarea {...commonProps} rows={3} /> : <input {...commonProps} type="text" />}
      </span>
    );
  }

  const isEmpty = !value.trim();
  return (
    <span
      className={`inline-edit ${multiline ? 'is-multiline' : ''} ${isEmpty ? 'is-empty' : ''} ${className}`.trim()}
      role="button"
      tabIndex={0}
      title="Double-click to edit"
      aria-label={`${ariaLabel ?? 'Field'}. Double-click or press Enter to edit.`}
      onDoubleClick={beginEditing}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === 'F2') {
          event.preventDefault();
          event.stopPropagation();
          setDraft(value);
          setIsEditing(true);
        }
      }}
    >
      {isEmpty ? placeholder : value}
    </span>
  );
}
