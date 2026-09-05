import { useState } from 'react';

function initials(name) {
  return (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

const statusBadgeClass = (status) =>
  `px-2 py-0.5 rounded-full text-xs font-medium ${
    status === 'active' ? 'bg-green-100 text-green-700' : 'bg-cream-100 text-muted'
  }`;

export default function EmployeeProfileHeader({
  employeeCode,
  status,
  name,
  jobPosition,
  tags = [],
  readOnly,
  onNameChange,
  onJobPositionChange,
  availableTags = [],
  onAddTag,
  onRemoveTag,
}) {
  const [tagInput, setTagInput] = useState('');

  function handleTagKeyDown(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const value = tagInput.trim();
    if (!value) return;
    onAddTag(value);
    setTagInput('');
  }

  return (
    <div className="flex items-start gap-5 pb-6 border-b border-navy-950/10">
      <div className="w-16 h-16 rounded-full bg-navy-950 text-cream-50 flex items-center justify-center text-xl font-bold shrink-0">
        {initials(name) || '?'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          {readOnly ? (
            <h1 className="text-2xl font-bold text-ink truncate">{name}</h1>
          ) : (
            <input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Employee name"
              className="text-2xl font-bold text-ink bg-transparent border-b border-transparent focus:border-navy-950/20 focus:outline-none w-full"
            />
          )}
          <div className="flex items-center gap-2 shrink-0">
            {employeeCode && <span className="text-xs text-muted">{employeeCode}</span>}
            {status && <span className={statusBadgeClass(status)}>{status}</span>}
          </div>
        </div>

        {readOnly ? (
          <p className="text-muted mt-0.5">{jobPosition || '—'}</p>
        ) : (
          <input
            value={jobPosition}
            onChange={(e) => onJobPositionChange(e.target.value)}
            placeholder="Job position"
            className="text-muted mt-0.5 bg-transparent border-b border-transparent focus:border-navy-950/20 focus:outline-none w-full"
          />
        )}

        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 text-xs rounded-full bg-gold-500/10 text-gold-600 px-2.5 py-1"
            >
              {tag}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onRemoveTag(tag)}
                  className="hover:text-gold-800"
                  aria-label={`Remove tag ${tag}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
          {!readOnly && (
            <>
              <input
                list="employee-tag-options"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="+ tag"
                className="text-xs rounded-full border border-navy-950/15 px-2.5 py-1 w-20 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <datalist id="employee-tag-options">
                {availableTags.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
