import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';

interface InlineEditProps {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  ariaLabel?: string;
}

export interface InlineSelectOption {
  value: string;
  label: string;
}

interface InlineSelectProps {
  value: string;
  options: InlineSelectOption[];
  onCommit: (value: string) => void;
  placeholder?: string;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    const control = multiline ? textareaRef.current : inputRef.current;
    control?.focus();
    if (control) control.setSelectionRange(control.value.length, control.value.length);
  }, [isEditing, multiline]);

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

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDraft(event.target.value);
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
    return (
      <span className={`inline-edit is-editing ${multiline ? 'is-multiline' : ''} ${className}`.trim()}>
        {multiline ? (
          <textarea
            ref={textareaRef}
            className="inline-edit-control"
            value={draft}
            rows={3}
            aria-label={ariaLabel ?? placeholder}
            onChange={handleChange}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
          />
        ) : (
          <input
            ref={inputRef}
            className="inline-edit-control"
            type="text"
            value={draft}
            aria-label={ariaLabel ?? placeholder}
            onChange={handleChange}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
          />
        )}
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

export function InlineSelect({
  value,
  options,
  onCommit,
  placeholder = 'Double-click to choose',
  className = '',
  ariaLabel,
}: InlineSelectProps) {
  const [isEditing, setIsEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const selectedLabel = options.find((option) => option.value === value)?.label;

  useEffect(() => {
    if (!isEditing) return;
    selectRef.current?.focus();
  }, [isEditing]);

  const beginEditing = (event?: MouseEvent<HTMLElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <span className={`inline-edit inline-select is-editing ${className}`.trim()}>
        <select
          ref={selectRef}
          className="inline-edit-control"
          value={value}
          aria-label={ariaLabel ?? placeholder}
          onChange={(event) => {
            const nextValue = event.target.value;
            setIsEditing(false);
            if (nextValue !== value) onCommit(nextValue);
          }}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Escape') {
              event.preventDefault();
              setIsEditing(false);
            }
          }}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </span>
    );
  }

  return (
    <span
      className={`inline-edit inline-select ${selectedLabel ? '' : 'is-empty'} ${className}`.trim()}
      role="button"
      tabIndex={0}
      title="Double-click to choose"
      aria-label={`${ariaLabel ?? 'Selection'}. Double-click or press Enter to choose.`}
      onDoubleClick={beginEditing}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === 'F2') {
          event.preventDefault();
          event.stopPropagation();
          setIsEditing(true);
        }
      }}
    >
      {selectedLabel ?? placeholder}
    </span>
  );
}
