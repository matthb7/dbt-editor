import JSZip from 'jszip';
import { collectFiles, revokeBlobUrls } from './files';
import { buildTree, findFirstFile } from './tree';

export async function importProjectArchive(file, previousFilesByPath = {}) {
  const zip = await JSZip.loadAsync(file);
  const files = await collectFiles(zip);

  if (files.length === 0) {
    revokeBlobUrls(previousFilesByPath);
    return {
      files: [],
      filesByPath: {},
      tree: null,
      fileCount: 0,
      firstFilePath: '',
      topLevelFolders: [],
      projectName: '',
      statusMessage: 'The ZIP file does not contain any files.',
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
    files,
    filesByPath,
    tree,
    fileCount: files.length,
    firstFilePath: findFirstFile(tree),
    topLevelFolders,
    projectName: file.name.replace(/\.zip$/i, ''),
    statusMessage: 'Project imported. Explorer and editor are ready.',
    statusState: 'ready',
  };
}
