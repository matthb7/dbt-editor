import { useId } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import EditorPanel from './components/EditorPanel';
import TerminalPanel from './components/TerminalPanel';
import TreeNode from './components/TreeNode';
import { formatSize, getLanguageLabel } from './lib/files';
import { clearActiveWorkspaceHandle } from './lib/workspaceHandles';
import {
  importProjectPreview,
  loadWorkspaceFolder,
  resetProject,
  selectPath,
  togglePath,
  updateSelectedFileContent,
} from './store/projectSlice';
import {
  selectDirtyCount,
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

  const handleContentChange = (nextContent) => {
    dispatch(updateSelectedFileContent(nextContent));
  };

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">Local dbt workspace</p>
        <h1>Pick a local project folder first. Keep ZIP preview as backup.</h1>
        <p className="hero-copy">
          The primary flow is now local filesystem access: choose a real folder
          on this machine and browse it directly in the app. ZIP import remains
          available as a quick preview path when you do not want to wire up a
          real workspace yet.
        </p>

        {tree ? (
          <div className="import-panel compact">
            <div className="loaded-source-card">
              <span className="badge">{sourceLabel || 'Loaded project'}</span>
              <p>{projectSource === 'workspace' ? 'Local folder connected.' : 'Browser-only ZIP preview loaded.'}</p>
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
                clearActiveWorkspaceHandle();
                dispatch(resetProject());
              }}
            >
              Reset source
            </button>
            <p className={`status-message ${status.state}`}>{status.message}</p>
          </div>
        ) : (
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
        )}
      </section>

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

        {tree ? (
          <div className="workspace-content">
            <aside className="explorer-panel">
              <div className="panel-header">
                <p className="section-label">Explorer</p>
                <span>{sourceLabel || 'Project tree'}</span>
              </div>
              <div className="tree-panel">
                <ul className="tree-list">
                  <TreeNode
                    node={{
                      ...tree,
                      name: projectName || 'project',
                      path: '',
                    }}
                    depth={0}
                    expandedPaths={expandedPaths}
                    onToggle={(path) => dispatch(togglePath(path))}
                    onSelect={(path) => dispatch(selectPath(path))}
                    selectedPath={selectedPath}
                  />
                </ul>
              </div>
            </aside>

            <section className="editor-panel">
              <div className="panel-header editor-header">
                <div>
                  <p className="section-label">Editor</p>
                  <h3>{selectedPath || 'Select a file'}</h3>
                </div>
                {selectedFile ? (
                  <div className="editor-badges">
                    <span className="badge">{getLanguageLabel(selectedFile.path)}</span>
                    <span className="badge">{formatSize(selectedFile.size)}</span>
                    {selectedFile.fileType === 'text' &&
                    selectedFile.content !== selectedFile.originalContent ? (
                      <span className="badge dirty">Unsaved</span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <EditorPanel
                file={selectedFile}
                onContentChange={handleContentChange}
              />

              {projectSource === 'workspace' ? <TerminalPanel /> : null}
            </section>
          </div>
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
    </main>
  );
}
