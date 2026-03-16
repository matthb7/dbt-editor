import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  importProjectArchive,
  importWorkspaceDirectory,
} from '../lib/importProject';
import { pickWorkspaceHandle, restoreWorkspaceHandle } from '../lib/workspaceHandles';

const initialState = {
  tree: null,
  projectName: '',
  projectSource: null,
  sourceLabel: '',
  detectedProjectRoot: null,
  detectedProfileName: '',
  filesByPath: {},
  fileCount: 0,
  selectedPath: '',
  expandedPaths: [''],
  status: {
    state: 'idle',
    message: 'Choose a local workspace folder or use ZIP preview as a fallback.',
  },
};

export const loadWorkspaceFolder = createAsyncThunk(
  'project/loadWorkspaceFolder',
  async (_, { getState, rejectWithValue }) => {
    try {
      const handle = await pickWorkspaceHandle();
      const previousFilesByPath = getState().project.filesByPath;
      return await importWorkspaceDirectory(handle, previousFilesByPath);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Unable to read this folder.',
      );
    }
  },
);

export const importProjectPreview = createAsyncThunk(
  'project/importProjectPreview',
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

export const restoreSavedWorkspace = createAsyncThunk(
  'project/restoreSavedWorkspace',
  async (_, { getState, rejectWithValue }) => {
    try {
      const handle = await restoreWorkspaceHandle();

      if (!handle) {
        return null;
      }

      const previousFilesByPath = getState().project.filesByPath;
      return await importWorkspaceDirectory(handle, previousFilesByPath);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Unable to restore the saved workspace.',
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
    resetProject(state) {
      state.tree = null;
      state.projectName = '';
      state.projectSource = null;
      state.sourceLabel = '';
      state.detectedProjectRoot = null;
      state.detectedProfileName = '';
      state.filesByPath = {};
      state.fileCount = 0;
      state.selectedPath = '';
      state.expandedPaths = [''];
      state.status = {
        state: 'idle',
        message:
          'Choose a local workspace folder or use ZIP preview as a fallback.',
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadWorkspaceFolder.pending, (state) => {
        state.status = {
          state: 'loading',
          message: 'Opening local workspace folder...',
        };
      })
      .addCase(loadWorkspaceFolder.fulfilled, applyProjectPayload)
      .addCase(loadWorkspaceFolder.rejected, applyProjectError)
      .addCase(restoreSavedWorkspace.pending, (state) => {
        state.status = {
          state: 'loading',
          message: 'Restoring saved workspace...',
        };
      })
      .addCase(restoreSavedWorkspace.fulfilled, (state, action) => {
        if (!action.payload) {
          state.status = {
            state: 'idle',
            message: 'Choose a local workspace folder or use ZIP preview as a fallback.',
          };
          return;
        }

        applyProjectPayload(state, action);
        state.status = {
          state: 'ready',
          message: 'Saved workspace restored.',
        };
      })
      .addCase(restoreSavedWorkspace.rejected, applyProjectError)
      .addCase(importProjectPreview.pending, (state, action) => {
        state.status = {
          state: 'loading',
          message: `Loading ${action.meta.arg.name}...`,
        };
      })
      .addCase(importProjectPreview.fulfilled, applyProjectPayload)
      .addCase(importProjectPreview.rejected, applyProjectError);
  },
});

function applyProjectPayload(state, action) {
  const {
    tree,
    projectName,
    projectSource,
    sourceLabel,
    detectedProjectRoot,
    detectedProfileName,
    filesByPath,
    fileCount,
    firstFilePath,
    topLevelFolders,
    statusMessage,
    statusState,
  } = action.payload;

  state.tree = tree;
  state.projectName = projectName;
  state.projectSource = projectSource;
  state.sourceLabel = sourceLabel;
  state.detectedProjectRoot = detectedProjectRoot;
  state.detectedProfileName = detectedProfileName;
  state.filesByPath = filesByPath;
  state.fileCount = fileCount;
  state.selectedPath = firstFilePath;
  state.expandedPaths = ['', ...topLevelFolders];
  state.status = {
    state: statusState,
    message: statusMessage,
  };
}

function applyProjectError(state, action) {
  state.tree = null;
  state.projectName = '';
  state.projectSource = null;
  state.sourceLabel = '';
  state.detectedProjectRoot = null;
  state.detectedProfileName = '';
  state.filesByPath = {};
  state.fileCount = 0;
  state.selectedPath = '';
  state.expandedPaths = [''];
  state.status = {
    state: 'error',
    message:
      typeof action.payload === 'string'
        ? action.payload
        : 'Unable to load this project source.',
  };
}

export const { resetProject, selectPath, togglePath, updateSelectedFileContent } = projectSlice.actions;

export default projectSlice.reducer;
