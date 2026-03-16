import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { importProjectArchive } from '../lib/importProject';

const initialState = {
  tree: null,
  projectName: '',
  filesByPath: {},
  fileCount: 0,
  selectedPath: '',
  expandedPaths: [''],
  status: {
    state: 'idle',
    message: 'Import a zipped dbt project to populate the explorer.',
  },
};

export const importProject = createAsyncThunk(
  'project/importProject',
  async (file, { getState, rejectWithValue }) => {
    try {
      const previousFilesByPath = getState().project.filesByPath;
      return await importProjectArchive(file, previousFilesByPath);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Unable to read this ZIP file.',
      );
    }
  },
);

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    togglePath(state, action) {
      const path = action.payload;
      const exists = state.expandedPaths.includes(path);

      state.expandedPaths = exists
        ? state.expandedPaths.filter((entry) => entry !== path)
        : [...state.expandedPaths, path];
    },
    selectPath(state, action) {
      state.selectedPath = action.payload;
    },
    updateSelectedFileContent(state, action) {
      const currentFile = state.filesByPath[state.selectedPath];

      if (!currentFile || currentFile.fileType !== 'text') {
        return;
      }

      currentFile.content = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(importProject.pending, (state, action) => {
        state.status = {
          state: 'loading',
          message: `Loading ${action.meta.arg.name}...`,
        };
      })
      .addCase(importProject.fulfilled, (state, action) => {
        const {
          tree,
          projectName,
          filesByPath,
          fileCount,
          firstFilePath,
          topLevelFolders,
          statusMessage,
          statusState,
        } = action.payload;

        state.tree = tree;
        state.projectName = projectName;
        state.filesByPath = filesByPath;
        state.fileCount = fileCount;
        state.selectedPath = firstFilePath;
        state.expandedPaths = ['', ...topLevelFolders];
        state.status = {
          state: statusState,
          message: statusMessage,
        };
      })
      .addCase(importProject.rejected, (state, action) => {
        state.tree = null;
        state.projectName = '';
        state.filesByPath = {};
        state.fileCount = 0;
        state.selectedPath = '';
        state.expandedPaths = [''];
        state.status = {
          state: 'error',
          message:
            typeof action.payload === 'string'
              ? action.payload
              : 'Unable to read this ZIP file.',
        };
      });
  },
});

export const { selectPath, togglePath, updateSelectedFileContent } =
  projectSlice.actions;

export default projectSlice.reducer;
