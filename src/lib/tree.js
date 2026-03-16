import { ROOT_ID } from './files';

export function buildTree(files) {
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
          fileType: file.fileType,
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

  sortNodes(root);
  return root;
}

function sortNodes(node) {
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
}

export function findFirstFile(node) {
  if (node.type === 'file') {
    return node.path;
  }

  for (const child of node.children ?? []) {
    const match = findFirstFile(child);
    if (match) {
      return match;
    }
  }

  return '';
}
