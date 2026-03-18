import { countDirtyFiles } from '../lib/files';

export const selectProjectState = (state) => state.project;

export const selectSelectedFile = (state) => {
  const { selectedPath, filesByPath } = state.project;
  return selectedPath ? filesByPath[selectedPath] ?? null : null;
};

export const selectOpenFiles = (state) =>
  state.project.openPaths
    .map((path) => state.project.filesByPath[path])
    .filter(Boolean);

export const selectDirtyPaths = (state) =>
  Object.values(state.project.filesByPath)
    .filter(
      (file) =>
        file.fileType === 'text' && file.content !== file.originalContent,
    )
    .map((file) => file.path);

export const selectDirtyCount = (state) =>
  countDirtyFiles(state.project.filesByPath);

export const selectDetectedProjectRoot = (state) =>
  state.project.detectedProjectRoot;

export const selectDetectedProfileName = (state) =>
  state.project.detectedProfileName;
