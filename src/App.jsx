import { useEffect, useId } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AdapterSetupPanel from './components/AdapterSetupPanel';
import AdapterStatusBar from './components/AdapterStatusBar';
import WorkspacePanels from './components/WorkspacePanels';
import {
  clearPersistedWorkspaceHandle,
} from './lib/workspaceHandles';
import {
  importProjectPreview,
  loadWorkspaceFolder,
  resetProject,
  restoreSavedWorkspace,
} from './store/projectSlice';
import {
  loadSetupStatus,
  syncProjectDefaults,
} from './store/adapterSetupSlice';
import {
  selectDirtyCount,
  selectDetectedProfileName,
  selectDetectedProjectRoot,
  selectProjectState,
  selectSelectedFile,
} from './store/selectors';

export default function App() {
  const inputId = useId();
  const dispatch = useDispatch();
  const {
    tree,
    projectName,
    projectSource,
    sourceLabel,
    fileCount,
    selectedPath,
    expandedPaths,
    status,
  } = useSelector(selectProjectState);
  const selectedFile = useSelector(selectSelectedFile);
  const dirtyCount = useSelector(selectDirtyCount);
  const detectedProjectRoot = useSelector(selectDetectedProjectRoot);
  const detectedProfileName = useSelector(selectDetectedProfileName);

  useEffect(() => {
    dispatch(loadSetupStatus());
  }, [dispatch]);

  useEffect(() => {
    dispatch(restoreSavedWorkspace());
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      syncProjectDefaults({
        profileName: detectedProfileName,
        projectName,
      }),
    );
  }, [detectedProfileName, projectName, dispatch]);

  const handleChooseWorkspace = async () => {
    await dispatch(loadWorkspaceFolder());
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await dispatch(importProjectPreview(file));
    event.target.value = '';
  };

  return (
    <main className={`app-shell ${tree ? 'project-loaded' : ''}`}>
      {!tree ? (
        <section className="hero-panel">
          <p className="eyebrow">Local dbt workspace</p>
          <h1>Pick a local project folder first. Keep ZIP preview as backup.</h1>
          <p className="hero-copy">
            The primary flow is now local filesystem access: choose a real folder
            on this machine and browse it directly in the app. ZIP import remains
            available as a quick preview path when you do not want to wire up a
            real workspace yet.
          </p>

          <div className="import-panel">
            <button
              type="button"
              className="import-button"
              onClick={handleChooseWorkspace}
            >
              Choose Workspace Folder
            </button>
            <label className="secondary-button" htmlFor={inputId}>
              ZIP Preview Instead
            </label>
            <input
              id={inputId}
              className="file-input"
              type="file"
              accept=".zip,application/zip"
              onChange={handleFileChange}
            />
            <p className={`status-message ${status.state}`}>{status.message}</p>
          </div>
        </section>
      ) : (
        <div className="workspace-bubble">
          <span className="badge">{sourceLabel || 'Loaded project'}</span>
          <div className="workspace-bubble-copy">
            <strong>{projectName}</strong>
            <span>
              {projectSource === 'workspace'
                ? 'Local folder connected'
                : 'ZIP preview loaded'}
            </span>
            {detectedProjectRoot !== null ? (
              <code className="source-root-label">
                dbt root: {detectedProjectRoot || '.'}
              </code>
            ) : null}
          </div>
          <button
            type="button"
            className="ghost-button reset-button"
            onClick={() => {
              clearPersistedWorkspaceHandle();
              dispatch(resetProject());
            }}
          >
            Reset
          </button>
        </div>
      )}

      <section className="workspace-panel">
        <div className="workspace-header">
          <div>
            <p className="section-label">Workspace</p>
            <h2>{projectName || 'No project loaded'}</h2>
          </div>
          <div className="project-stats">
            <span>{fileCount} files</span>
            <span>{dirtyCount} edited</span>
          </div>
        </div>

        {tree ? <AdapterStatusBar /> : null}

        {tree ? (
          <WorkspacePanels
            tree={tree}
            projectName={projectName}
            sourceLabel={sourceLabel}
            projectSource={projectSource}
            expandedPaths={expandedPaths}
            selectedPath={selectedPath}
            selectedFile={selectedFile}
          />
        ) : (
          <div className="empty-panel">
            <p>No project source selected.</p>
            <span>
              Choose a local workspace folder to work against real files on this
              machine, or use ZIP preview for a quick read-only style intake
              flow.
            </span>
          </div>
        )}
      </section>

      <AdapterSetupPanel />
    </main>
  );
}
