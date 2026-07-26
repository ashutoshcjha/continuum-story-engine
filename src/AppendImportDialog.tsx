import { useMemo, useState } from 'react';
import type { AppendAnalysis, AppendApplyResult } from './aiExchange';

interface AppendImportDialogProps {
  analysis: AppendAnalysis;
  onCancel: () => void;
  onApply: (updateMatches: boolean) => Promise<AppendApplyResult>;
}

export function AppendImportDialog({ analysis, onCancel, onApply }: AppendImportDialogProps) {
  const [updateMatches, setUpdateMatches] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string>();
  const previews = useMemo(() => [
    ...analysis.entityPlans
      .filter((plan) => plan.status !== 'skip')
      .slice(0, 10)
      .map((plan) => `${plan.status === 'add' ? 'Add' : 'Update'} ${plan.incoming.type}: ${plan.incoming.name}`),
    ...analysis.relationshipPlans
      .filter((plan) => plan.status !== 'skip')
      .slice(0, 6)
      .map((plan) => `${plan.status === 'add' ? 'Add' : 'Update'} relationship: ${plan.incoming.label}`),
  ], [analysis]);
  const issues = [
    ...analysis.warnings,
    ...analysis.entityPlans.filter((plan) => plan.issue).map((plan) => plan.issue!),
    ...analysis.relationshipPlans.filter((plan) => plan.issue).map((plan) => plan.issue!),
  ];

  const apply = async () => {
    setIsApplying(true);
    setError(undefined);
    try {
      await onApply(updateMatches);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The append could not be applied.');
      setIsApplying(false);
    }
  };

  return (
    <div className="append-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isApplying) onCancel();
    }}>
      <section className="append-dialog" role="dialog" aria-modal="true" aria-labelledby="append-dialog-title">
        <header>
          <div>
            <span>Append review</span>
            <h2 id="append-dialog-title">{analysis.source.label}</h2>
            <p>{analysis.source.sourceFormat === 'continuum' ? 'Complete Continuum project imported as an additive change set.' : 'Continuum append package.'}</p>
          </div>
          <button type="button" aria-label="Close append review" disabled={isApplying} onClick={onCancel}>×</button>
        </header>

        <div className="append-stat-grid">
          <div><b>{analysis.stats.entityAdds}</b><span>New entities</span></div>
          <div><b>{analysis.stats.entityUpdates}</b><span>Entity matches</span></div>
          <div><b>{analysis.stats.relationshipAdds}</b><span>New relationships</span></div>
          <div><b>{analysis.stats.relationshipUpdates}</b><span>Relationship matches</span></div>
          <div><b>{analysis.stats.skipped}</b><span>Skipped</span></div>
        </div>

        <label className="append-update-option">
          <input type="checkbox" checked={updateMatches} onChange={(event) => setUpdateMatches(event.target.checked)} />
          <span><b>Update matching records</b><small>Matches use exact IDs first, then entity type plus name. Turn this off to add only genuinely new records.</small></span>
        </label>

        {previews.length > 0 && (
          <section className="append-preview-list">
            <h3>Planned changes</h3>
            <ul>{previews.map((preview, index) => <li key={`${preview}-${index}`}>{preview}</li>)}</ul>
            {(analysis.stats.entityAdds + analysis.stats.entityUpdates + analysis.stats.relationshipAdds + analysis.stats.relationshipUpdates) > previews.length && <p>Additional changes are included in the counts above.</p>}
          </section>
        )}

        {issues.length > 0 && (
          <section className="append-issue-list">
            <h3>Warnings and skipped records</h3>
            <ul>{issues.slice(0, 12).map((issue, index) => <li key={`${issue}-${index}`}>{issue}</li>)}</ul>
            {issues.length > 12 && <p>{issues.length - 12} additional warning{issues.length - 12 === 1 ? '' : 's'} omitted from this preview.</p>}
          </section>
        )}

        <div className="append-rollback-note">
          <b>One-step rollback is created before applying.</b>
          <p>Undo restores the exact project state from immediately before this append. Manual edits made after the append would also be reverted.</p>
        </div>

        {error && <p className="append-error">{error}</p>}
        <footer>
          <button type="button" disabled={isApplying} onClick={onCancel}>Cancel</button>
          <button type="button" className="primary" disabled={isApplying} onClick={apply}>{isApplying ? 'Applying…' : 'Apply append'}</button>
        </footer>
      </section>
    </div>
  );
}
