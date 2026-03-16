import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import EditorPanel from './EditorPanel';
import TerminalPanel from './TerminalPanel';
import TreeNode from './TreeNode';
import { formatSize, getLanguageLabel } from '../lib/files';
import { selectPath, togglePath, updateSelectedFileContent } from '../store/projectSlice';

function PanelHeader({ label, title, meta, collapsed, onToggle }) {
  return (
    <div className={`panel-header ${collapsed ? 'collapsed' : ''}`}>
      <div className="panel-header-copy">
        <p className="section-label">{label}</p>
        <h3>{title || label}</h3>
      </div>
      <div className="panel-actions">
        {meta ? <span className="panel-meta-label">{meta}</span> : null}
        <button
          type="button"
          className="panel-toggle"
          onClick={onToggle}
          aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
        >
          {collapsed ? '+' : '−'}
        </button>
      </div>
    </div>
  );
}

export default function WorkspacePanels({
  tree,
  projectName,
  sourceLabel,
  projectSource,
  expandedPaths,
  selectedPath,
  selectedFile,
}) {
  const dispatch = useDispatch();
  const shellRef = useRef(null);
  const verticalRef = useRef(null);
  const horizontalRef = useRef(null);
  const [explorerWidth, setExplorerWidth] = useState(310);
  const [terminalHeight, setTerminalHeight] = useState(280);
  const [collapsed, setCollapsed] = useState({
    explorer: false,
    editor: false,
    terminal: false,
  });

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return undefined;
    }

    const handleVerticalDrag = (event) => {
      const rect = shell.getBoundingClientRect();
      const next = Math.min(Math.max(event.clientX - rect.left, 220), 520);
      setExplorerWidth(next);
    };

    const handleHorizontalDrag = (event) => {
      const editorShell = horizontalRef.current?.parentElement;
      if (!editorShell) {
        return;
      }
      const rect = editorShell.getBoundingClientRect();
      const distanceFromBottom = rect.bottom - event.clientY;
      const next = Math.min(
        Math.max(distanceFromBottom, 180),
        Math.max(180, rect.height - 120),
      );
      setTerminalHeight(next);
    };

    const attachDrag = (handle, onMove) => {
      if (!handle) {
        return () => {};
      }

      const onPointerDown = (downEvent) => {
        downEvent.preventDefault();
        window.addEventListener('pointermove', onMove);
        window.addEventListener(
          'pointerup',
          () => {
            window.removeEventListener('pointermove', onMove);
          },
          { once: true },
        );
      };

      handle.addEventListener('pointerdown', onPointerDown);
      return () => handle.removeEventListener('pointerdown', onPointerDown);
    };

    const detachVertical = attachDrag(verticalRef.current, handleVerticalDrag);
    const detachHorizontal = attachDrag(horizontalRef.current, handleHorizontalDrag);

    return () => {
      detachVertical();
      detachHorizontal();
      window.removeEventListener('pointermove', handleVerticalDrag);
      window.removeEventListener('pointermove', handleHorizontalDrag);
    };
  }, []);

  const effectiveExplorerWidth = collapsed.explorer ? 64 : explorerWidth;
  const showTerminal = projectSource === 'workspace';
  const editorAreaStyle = showTerminal
    ? {
        gridTemplateRows: collapsed.editor
          ? collapsed.terminal
            ? '60px 60px'
            : '60px minmax(0, 1fr)'
          : collapsed.terminal
            ? 'minmax(0, 1fr) 60px'
            : `minmax(160px, calc(100% - ${terminalHeight + 10}px)) 10px ${terminalHeight}px`,
      }
    : {
        gridTemplateRows: collapsed.editor ? '60px' : '1fr',
      };

  return (
    <div
      ref={shellRef}
      className={`workspace-content ${
        collapsed.explorer ? 'explorer-collapsed' : ''
      } ${collapsed.editor ? 'editor-collapsed' : ''} ${
        collapsed.terminal ? 'terminal-collapsed' : ''
      }`}
      style={{ gridTemplateColumns: `${effectiveExplorerWidth}px 10px minmax(0, 1fr)` }}
    >
      <aside className="explorer-panel pane-card">
        <PanelHeader
          label="Explorer"
          title={collapsed.explorer ? 'Files' : projectName || 'Project'}
          meta={collapsed.explorer ? null : sourceLabel || 'Project tree'}
          collapsed={collapsed.explorer}
          onToggle={() =>
            setCollapsed((current) => ({ ...current, explorer: !current.explorer }))
          }
        />
        {!collapsed.explorer ? (
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
        ) : (
          <div className="collapsed-rail vertical">Files</div>
        )}
      </aside>

      <div
        ref={verticalRef}
        className="pane-resizer vertical"
        role="separator"
        aria-orientation="vertical"
      />

      <section className="editor-stack" style={editorAreaStyle}>
        <section className="editor-panel pane-card">
          <div className={`panel-header editor-header ${collapsed.editor ? 'collapsed' : ''}`}>
            <div>
              <p className="section-label">Editor</p>
              <h3>{collapsed.editor ? 'Editor' : selectedPath || 'Select a file'}</h3>
            </div>
            <div className="panel-actions">
              {!collapsed.editor && selectedFile ? (
                <div className="editor-badges">
                  <span className="badge">{getLanguageLabel(selectedFile.path)}</span>
                  <span className="badge">{formatSize(selectedFile.size)}</span>
                  {selectedFile.fileType === 'text' &&
                  selectedFile.content !== selectedFile.originalContent ? (
                    <span className="badge dirty">Unsaved</span>
                  ) : null}
                </div>
              ) : null}
              <button
                type="button"
                className="panel-toggle"
                onClick={() =>
                  setCollapsed((current) => ({ ...current, editor: !current.editor }))
                }
                aria-label={collapsed.editor ? 'Expand editor' : 'Collapse editor'}
              >
                {collapsed.editor ? '+' : '−'}
              </button>
            </div>
          </div>

          {!collapsed.editor ? (
            <EditorPanel
              file={selectedFile}
              onContentChange={(nextContent) =>
                dispatch(updateSelectedFileContent(nextContent))
              }
            />
          ) : null}
        </section>

        {showTerminal ? (
          <>
            {!collapsed.editor && !collapsed.terminal ? (
              <div
                ref={horizontalRef}
                className="pane-resizer horizontal"
                role="separator"
                aria-orientation="horizontal"
              />
            ) : null}
            <div
              className={`terminal-shell-panel pane-card ${
                collapsed.terminal ? 'collapsed' : ''
              }`}
            >
              <TerminalPanel
                collapsed={collapsed.terminal}
                onToggle={() =>
                  setCollapsed((current) => ({
                    ...current,
                    terminal: !current.terminal,
                  }))
                }
              />
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
