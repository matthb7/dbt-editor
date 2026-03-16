import JSZip from 'jszip';
import { collectFiles, hydrateFileEntry, revokeBlobUrls } from './files';
import { buildTree, findFirstFile } from './tree';

export async function importProjectArchive(file, previousFilesByPath = {}) {
  const zip = await JSZip.loadAsync(file);
  const files = await collectFiles(zip);

  return normalizeImportedProject({
    files,
    previousFilesByPath,
    projectName: file.name.replace(/\.zip$/i, ''),
    sourceType: 'zip-preview',
    sourceLabel: 'ZIP preview',
    emptyMessage: 'The ZIP file does not contain any files.',
    readyMessage: 'ZIP preview loaded. Explorer and editor are ready.',
  });
}

export async function importWorkspaceDirectory(handle, previousFilesByPath = {}) {
  const files = await collectDirectoryFiles(handle);

  return normalizeImportedProject({
    files,
    previousFilesByPath,
    projectName: handle.name,
    sourceType: 'workspace',
    sourceLabel: 'Local workspace',
    emptyMessage: 'The selected folder does not contain any readable files.',
    readyMessage: 'Workspace loaded. Explorer and editor are ready.',
  });
}

async function collectDirectoryFiles(directoryHandle, parentPath = '') {
  const files = [];

  for await (const entry of directoryHandle.values()) {
    const nextPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;

    if (entry.kind === 'directory') {
      files.push(...(await collectDirectoryFiles(entry, nextPath)));
      continue;
    }

    const file = await entry.getFile();
    files.push(
      await hydrateFileEntry({
        path: nextPath,
        size: file.size,
        readText: () => file.text(),
        readBlob: () => Promise.resolve(file),
      }),
    );
  }

  return files;
}

function normalizeImportedProject({
  files,
  previousFilesByPath,
  projectName,
  sourceType,
  sourceLabel,
  emptyMessage,
  readyMessage,
}) {
  const detectedProjectRoot = findDbtProjectRoot(files);
  const detectedProfileName = findDbtProfileName(files, detectedProjectRoot);

  if (files.length === 0) {
    revokeBlobUrls(previousFilesByPath);
    return {
      filesByPath: {},
      tree: null,
      fileCount: 0,
      firstFilePath: '',
      topLevelFolders: [],
      projectName: '',
      projectSource: null,
      sourceLabel: '',
      detectedProjectRoot: null,
      detectedProfileName: '',
      statusMessage: emptyMessage,
      statusState: 'error',
    };
  }

  const filesByPath = Object.fromEntries(files.map((entry) => [entry.path, entry]));
  const tree = buildTree(files);
  const topLevelFolders = tree.children
    .filter((child) => child.type === 'folder')
    .map((child) => child.path);

  revokeBlobUrls(previousFilesByPath);

  return {
    filesByPath,
    tree,
    fileCount: files.length,
    firstFilePath: findFirstFile(tree),
    topLevelFolders,
    projectName,
    projectSource: sourceType,
    sourceLabel,
    detectedProjectRoot,
    detectedProfileName,
    statusMessage: readyMessage,
    statusState: 'ready',
  };
}

function findDbtProjectRoot(files) {
  const matches = files
    .filter((entry) => {
      const segments = entry.path.split('/');
      return segments[segments.length - 1] === 'dbt_project.yml';
    })
    .sort((left, right) => compareProjectFileCandidates(left.path, right.path));

  if (matches.length === 0) {
    return null;
  }

  const match = matches[0];
  const segments = match.path.split('/');
  segments.pop();
  return segments.join('/');
}

function findDbtProfileName(files, detectedProjectRoot) {
  const rootPrefix = detectedProjectRoot ? `${detectedProjectRoot}/` : '';
  const targetPath = `${rootPrefix}dbt_project.yml`;
  const projectFile = files.find((entry) => entry.path === targetPath);

  if (!projectFile?.content) {
    return '';
  }

  const match = projectFile.content.match(/^\s*profile:\s*["']?([^"'\n]+)["']?/m);
  return match ? match[1].trim() : '';
}

function compareProjectFileCandidates(leftPath, rightPath) {
  const leftSegments = leftPath.split('/');
  const rightSegments = rightPath.split('/');
  const leftRootPenalty = getProjectRootPenalty(leftSegments);
  const rightRootPenalty = getProjectRootPenalty(rightSegments);

  if (leftRootPenalty !== rightRootPenalty) {
    return leftRootPenalty - rightRootPenalty;
  }

  if (leftSegments.length !== rightSegments.length) {
    return leftSegments.length - rightSegments.length;
  }

  return leftPath.localeCompare(rightPath);
}

function getProjectRootPenalty(segments) {
  const folderSegments = segments.slice(0, -1);

  if (folderSegments.length === 0) {
    return 0;
  }

  if (folderSegments[0] === 'dbt_packages') {
    return 2;
  }

  return 1;
}
