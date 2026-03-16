import { countDirtyFiles } from '../lib/files';

export const selectProjectState = (state) => state.project;

export const selectSelectedFile = (state) => {
  const { selectedPath, filesByPath } = state.project;
  return selectedPath ? filesByPath[selectedPath] ?? null : null;
};

export const selectDirtyCount = (state) =>
  countDirtyFiles(state.project.filesByPath);

export const selectDetectedProjectRoot = (state) =>
  state.project.detectedProjectRoot;

export const selectDetectedProfileName = (state) =>
  state.project.detectedProfileName;
