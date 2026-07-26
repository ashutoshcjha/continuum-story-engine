import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppendImportDialog } from './AppendImportDialog';
import {
  applyAppendImport,
  exportAIContext,
  prepareAppendImport,
  type AppendAnalysis,
  type AppendApplyResult,
} from './aiExchange';
import {
  clearAppendRollbackSnapshot,
  loadAppendRollbackSnapshot,
  loadLastLocalProject,
  saveAppendRollbackSnapshot,
  saveLocalProject,
  type AppendRollbackSnapshot,
} from './db';
import { exportHumanProject } from './humanExport';
import type { ContinuumProject } from './model';
import './exchange.css';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The project exchange action could not be completed.';
}

export function ProjectExchangeActions() {
  const [host, setHost] = useState<Element | null>(null);
  const [analysis, setAnalysis] = useState<AppendAnalysis>();
  const [appendBase, setAppendBase] = useState<ContinuumProject>();
  const [rollback, setRollback] = useState<AppendRollbackSnapshot>();
  const [busy, setBusy] = useState(false);
  const appendRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let disposed = false;
    const attach = () => {
      if (disposed) return;
      const target = document.querySelector('.top-actions');
      if (target) setHost(target);
      else window.requestAnimationFrame(attach);
    };
    attach();

    Promise.all([loadLastLocalProject(), loadAppendRollbackSnapshot()]).then(async ([project, snapshot]) => {
      if (disposed) return;
      if (snapshot && project && snapshot.projectId !== project.id) {
        await clearAppendRollbackSnapshot();
        setRollback(undefined);
      } else {
        setRollback(snapshot);
      }
    });

    return () => { disposed = true; };
  }, []);

  const withCurrentProject = async (action: (project: ContinuumProject) => void | Promise<void>) => {
    setBusy(true);
    try {
      const project = await loadLastLocalProject();
      if (!project) throw new Error('No locally saved Continuum project is available yet.');
      await action(project);
    } catch (error) {
      window.alert(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const beginAppend = async (file: File) => {
    setBusy(true);
    try {
      const project = await loadLastLocalProject();
      if (!project) throw new Error('No locally saved Continuum project is available yet.');
      const prepared = await prepareAppendImport(file, project);
      setAppendBase(project);
      setAnalysis(prepared);
    } catch (error) {
      window.alert(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const applyAppend = async (updateMatches: boolean): Promise<AppendApplyResult> => {
    if (!analysis || !appendBase) throw new Error('The append preview is no longer available.');
    const snapshot = await saveAppendRollbackSnapshot(
      appendBase,
      analysis.source.label,
      analysis.source.sourceFileName,
    );
    const result = applyAppendImport(appendBase, analysis, updateMatches);
    await saveLocalProject(result.project);
    setRollback(snapshot);
    setAnalysis(undefined);
    setAppendBase(undefined);
    window.location.reload();
    return result;
  };

  const undoAppend = async () => {
    const snapshot = await loadAppendRollbackSnapshot();
    if (!snapshot) {
      setRollback(undefined);
      window.alert('There is no append snapshot to restore.');
      return;
    }
    const confirmed = window.confirm(`Restore the project to immediately before “${snapshot.label}”?\n\nThis restores the exact pre-append snapshot. Manual edits made after that append will also be lost.`);
    if (!confirmed) return;
    setBusy(true);
    try {
      await saveLocalProject({ ...snapshot.data, updatedAt: new Date().toISOString() });
      await clearAppendRollbackSnapshot();
      setRollback(undefined);
      window.location.reload();
    } catch (error) {
      window.alert(errorMessage(error));
      setBusy(false);
    }
  };

  const controls = (
    <div className="exchange-actions" aria-label="Project exchange actions">
      <button
        type="button"
        className="append-action"
        disabled={busy}
        title="Append a complete Continuum project or a continuum-append change set"
        onClick={() => appendRef.current?.click()}
      >
        Append update
      </button>
      {rollback && (
        <button type="button" className="rollback-action" disabled={busy} title={`Restore the state before ${rollback.label}`} onClick={undoAppend}>
          Undo append
        </button>
      )}
      <button type="button" className="human-export" disabled={busy} onClick={() => withCurrentProject((project) => exportHumanProject(project))}>
        Export human
      </button>
      <button type="button" className="ai-export" disabled={busy} onClick={() => withCurrentProject((project) => exportAIContext(project))}>
        Export AI
      </button>
      <input
        hidden
        ref={appendRef}
        type="file"
        accept=".continuum,.json,application/json"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) await beginAppend(file);
        }}
      />
    </div>
  );

  return (
    <>
      {host ? createPortal(controls, host) : <div className="exchange-actions exchange-actions--floating">{controls}</div>}
      {analysis && (
        <AppendImportDialog
          analysis={analysis}
          onCancel={() => {
            setAnalysis(undefined);
            setAppendBase(undefined);
          }}
          onApply={applyAppend}
        />
      )}
    </>
  );
}
