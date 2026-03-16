import { formatSize } from '../lib/files';

export default function TreeNode({
  node,
  depth,
  expandedPaths,
  onToggle,
  onSelect,
  selectedPath,
}) {
  const isFolder = node.type === 'folder';
  const isExpanded = expandedPaths.has(node.path);
  const paddingLeft = 16 + depth * 18;

  return (
    <li className="tree-node">
      <button
        type="button"
        className={`tree-row ${isFolder ? 'folder' : 'file'} ${
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
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
