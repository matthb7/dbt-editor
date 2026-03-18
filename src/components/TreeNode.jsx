import { formatSize } from '../lib/files';

function FolderGlyph({ isExpanded }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.5 7.5a2 2 0 0 1 2-2h4l1.8 2H18.5a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={
          isExpanded
            ? 'M4.5 10.5h15l-1.3 6a2 2 0 0 1-2 1.5H7a2 2 0 0 1-2-1.6l-.5-5.9Z'
            : 'M4.5 9.5h15a1.5 1.5 0 0 1 1.5 1.8l-.7 5.1a2 2 0 0 1-2 1.7H5.8a2 2 0 0 1-2-1.7l-.8-5.1a1.5 1.5 0 0 1 1.5-1.8Z'
        }
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 3.75h6l4.25 4.25v10.25a2 2 0 0 1-2 2h-8.5a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 3.75V8h4.25"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ImageGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="4.25"
        y="5"
        width="15.5"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="9" cy="10" r="1.4" fill="currentColor" />
      <path
        d="m7 16 3.2-3.2a1.2 1.2 0 0 1 1.7 0L14 15l1.4-1.4a1.2 1.2 0 0 1 1.7 0L19 15.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BinaryGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="4.25"
        y="4.25"
        width="15.5"
        height="15.5"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M9 9v6M9 9c-.8.3-1.4 1-1.4 1.9S8.2 12.5 9 12.8M9 9c.8.3 1.4 1 1.4 1.9S9.8 12.5 9 12.8M15 9v6M15 9c-.8.3-1.4 1-1.4 1.9s.6 1.6 1.4 1.9M15 9c.8.3 1.4 1 1.4 1.9s-.6 1.6-1.4 1.9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getFileGlyph(node, isExpanded) {
  if (node.type === 'folder') {
    return <FolderGlyph isExpanded={isExpanded} />;
  }

  if (node.fileType === 'image') {
    return <ImageGlyph />;
  }

  if (node.fileType === 'binary') {
    return <BinaryGlyph />;
  }

  return <FileGlyph />;
}

export default function TreeNode({
  node,
  depth,
  dirtyPaths = [],
  expandedPaths,
  onToggle,
  onSelect,
  selectedPath,
}) {
  const isFolder = node.type === 'folder';
  const isExpanded = expandedPaths.includes(node.path);
  const isDirty = node.type === 'file' && dirtyPaths.includes(node.path);
  const paddingLeft = 16 + depth * 18;

  return (
    <li className="tree-node">
      <button
        type="button"
        className={`tree-row ${isFolder ? 'folder' : `file ${node.fileType}`} ${
          selectedPath === node.path ? 'selected' : ''
        }`}
        style={{ paddingLeft }}
        onClick={() => {
          if (isFolder) {
            onToggle(node.path);
            return;
          }

          onSelect(node.path);
        }}
      >
        <span className="tree-icon" aria-hidden="true">
          {isFolder ? (isExpanded ? '▾' : '▸') : node.fileType === 'image' ? '◈' : '•'}
        </span>
        <span className="tree-glyph" aria-hidden="true">
          {getFileGlyph(node, isExpanded)}
        </span>
        <span className="tree-label">
          {node.name}
          {isDirty ? <span className="dirty-indicator">*</span> : null}
        </span>
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
              dirtyPaths={dirtyPaths}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
