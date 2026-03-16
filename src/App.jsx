import { useId } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import EditorPanel from './components/EditorPanel';
import TreeNode from './components/TreeNode';
import { formatSize, getLanguageLabel } from './lib/files';
import {
  importProject,
  selectPath,
  togglePath,
  updateSelectedFileContent,
} from './store/projectSlice';
import {
  selectDirtyCount,
  selectProjectState,
  selectSelectedFile,
} from './store/selectors';

export default function App() {
  const inputId = useId();
  const dispatch = useDispatch();
  const { tree, projectName, fileCount, selectedPath, expandedPaths, status } =
    useSelector(selectProjectState);
  const selectedFile = useSelector(selectSelectedFile);
  const dirtyCount = useSelector(selectDirtyCount);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await dispatch(importProject(file));
    event.target.value = '';
  };

  const handleContentChange = (nextContent) => {
    dispatch(updateSelectedFileContent(nextContent));
  };

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">Local dbt workspace</p>
        <h1>Import a dbt project ZIP and inspect or edit it locally.</h1>
        <p className="hero-copy">
          This slice adds a basic in-browser editor for common text files while
          keeping the project entirely local. SQL and YAML are the main targets,
          but the app also handles JSON, text files, images, and unknown binary
          entries gracefully.
        </p>

        <div className="import-panel">
          <label className="import-button" htmlFor={inputId}>
            Choose ZIP
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
                <span>Imported tree</span>
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
            </section>
          </div>
        ) : (
          <div className="empty-panel">
            <p>Nothing imported yet.</p>
            <span>
              Upload a zipped dbt repository to browse folders like `models`,
              `macros`, `seeds`, and `snapshots`, then open files in the editor.
            </span>
          </div>
        )}
      </section>
    </main>
  );
}
