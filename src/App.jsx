import { useId, useState } from 'react';
import JSZip from 'jszip';

const ROOT_ID = '__root__';

function buildTree(files) {
  const root = {
    id: ROOT_ID,
    name: 'project',
    type: 'folder',
    path: '',
    children: [],
  };
  const folders = new Map([['', root]]);

  for (const file of files) {
    const segments = file.path.split('/').filter(Boolean);
    let currentPath = '';

    segments.forEach((segment, index) => {
      const isFile = index === segments.length - 1;
      const parent = folders.get(currentPath);
      const nextPath = currentPath ? `${currentPath}/${segment}` : segment;

      if (isFile) {
        parent.children.push({
          id: `file:${nextPath}`,
          name: segment,
          type: 'file',
          path: nextPath,
          size: file.size,
        });
        return;
      }

      if (!folders.has(nextPath)) {
        const folderNode = {
          id: `folder:${nextPath}`,
          name: segment,
          type: 'folder',
          path: nextPath,
          children: [],
        };
        folders.set(nextPath, folderNode);
        parent.children.push(folderNode);
      }

      currentPath = nextPath;
    });
  }

  const sortNodes = (node) => {
    if (!node.children) {
      return;
    }

    node.children.sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === 'folder' ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });

    node.children.forEach(sortNodes);
  };

  sortNodes(root);
  return root;
}

function collectFiles(zip) {
  return Object.values(zip.files)
    .filter((entry) => !entry.dir)
    .map((entry) => ({
      path: entry.name,
      size: entry._data?.uncompressedSize ?? 0,
    }));
}

function TreeNode({ node, depth, expandedPaths, onToggle }) {
  const isFolder = node.type === 'folder';
  const isExpanded = expandedPaths.has(node.path);
  const paddingLeft = 16 + depth * 18;

  return (
    <li className="tree-node">
      <button
        type="button"
        className={`tree-row ${isFolder ? 'folder' : 'file'}`}
        style={{ paddingLeft }}
        onClick={() => isFolder && onToggle(node.path)}
      >
        <span className="tree-icon" aria-hidden="true">
          {isFolder ? (isExpanded ? '▾' : '▸') : '•'}
        </span>
        <span className="tree-label">{node.name}</span>
        {node.type === 'file' ? (
          <span className="tree-meta">{formatSize(node.size)}</span>
        ) : null}
      </button>

      {isFolder && isExpanded && node.children.length > 0 ? (
        <ul className="tree-list">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function formatSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function App() {
  const inputId = useId();
  const [projectTree, setProjectTree] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [fileCount, setFileCount] = useState(0);
  const [expandedPaths, setExpandedPaths] = useState(new Set(['', ROOT_ID]));
  const [status, setStatus] = useState({
    state: 'idle',
    message: 'Import a zipped dbt project to populate the explorer.',
  });

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setStatus({
      state: 'loading',
      message: `Loading ${file.name}...`,
    });

    try {
      const zip = await JSZip.loadAsync(file);
      const files = collectFiles(zip);

      if (files.length === 0) {
        setProjectTree(null);
        setProjectName('');
        setFileCount(0);
        setExpandedPaths(new Set(['', ROOT_ID]));
        setStatus({
          state: 'error',
          message: 'The ZIP file does not contain any files.',
        });
        return;
      }

      const tree = buildTree(files);
      const topLevelFolders = tree.children
        .filter((child) => child.type === 'folder')
        .map((child) => child.path);

      setProjectTree(tree);
      setProjectName(file.name.replace(/\.zip$/i, ''));
      setFileCount(files.length);
      setExpandedPaths(new Set(['', ROOT_ID, ...topLevelFolders]));
      setStatus({
        state: 'ready',
        message: 'Project imported. Explorer is ready.',
      });
    } catch (error) {
      setProjectTree(null);
      setProjectName('');
      setFileCount(0);
      setExpandedPaths(new Set(['', ROOT_ID]));
      setStatus({
        state: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to read this ZIP file.',
      });
    } finally {
      event.target.value = '';
    }
  };

  const togglePath = (path) => {
    setExpandedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">Local dbt workspace</p>
        <h1>Import a dbt project ZIP and browse it locally.</h1>
        <p className="hero-copy">
          This first slice focuses on intake and navigation: upload a zipped
          dbt project, unpack it in the browser, and inspect the file tree
          before editor features land.
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
            <p className="section-label">Explorer</p>
            <h2>{projectName || 'No project loaded'}</h2>
          </div>
          <div className="project-stats">
            <span>{fileCount} files</span>
          </div>
        </div>

        {projectTree ? (
          <div className="tree-panel">
            <ul className="tree-list">
              <TreeNode
                node={{
                  ...projectTree,
                  name: projectName || 'project',
                  path: '',
                }}
                depth={0}
                expandedPaths={expandedPaths}
                onToggle={togglePath}
              />
            </ul>
          </div>
        ) : (
          <div className="empty-panel">
            <p>Nothing imported yet.</p>
            <span>
              Upload a zipped dbt repository to see folders like `models`,
              `macros`, `seeds`, and `snapshots`.
            </span>
          </div>
        )}
      </section>
    </main>
  );
}
