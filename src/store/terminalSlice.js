import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { executeTerminalCommand } from '../lib/terminalApi';

const initialState = {
  projectPath: '',
  draftCommand: 'dbt --version',
  isRunning: false,
  entries: [],
};

export const runTerminalCommand = createAsyncThunk(
  'terminal/runTerminalCommand',
  async (_, { getState, rejectWithValue }) => {
    const state = getState().terminal;
    const projectState = getState().project;
    const commandText = state.draftCommand.trim();
    const isVersionCommand =
      commandText === 'dbt --version' || commandText === 'dbt -V';

    if (
      !isVersionCommand &&
      (projectState.detectedProjectRoot === null ||
        projectState.projectSource !== 'workspace')
    ) {
      return rejectWithValue({
        ok: false,
        exitCode: 1,
        stdout: '',
        stderr:
          'Command execution is only enabled for a real workspace folder with a detected dbt_project.yml root.',
        cwd: projectState.detectedProjectRoot ?? '',
        commandText,
      });
    }

    try {
      return await executeTerminalCommand({
        commandText,
        projectPath: '',
      });
    } catch (error) {
      if (error?.payload) {
        return rejectWithValue(error.payload);
      }

      return rejectWithValue({
        ok: false,
        exitCode: 1,
        stdout: '',
        stderr:
          error instanceof Error ? error.message : 'Command execution failed.',
        cwd: projectState.detectedProjectRoot ?? '',
        commandText,
      });
    }
  },
);

const terminalSlice = createSlice({
  name: 'terminal',
  initialState,
  reducers: {
    setDraftCommand(state, action) {
      state.draftCommand = action.payload;
    },
    clearTerminalEntries(state) {
      state.entries = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runTerminalCommand.pending, (state, action) => {
        state.isRunning = true;
        state.entries.unshift({
          id: action.meta.requestId,
          commandText: state.draftCommand,
          cwd: '',
          status: 'running',
          exitCode: null,
          stdout: '',
          stderr: '',
        });
      })
      .addCase(runTerminalCommand.fulfilled, (state, action) => {
        state.isRunning = false;
        const entry = state.entries.find(
          (item) => item.id === action.meta.requestId,
        );

        if (!entry) {
          return;
        }

        entry.status = action.payload.ok ? 'success' : 'error';
        entry.exitCode = action.payload.exitCode;
        entry.stdout = action.payload.stdout;
        entry.stderr = action.payload.stderr;
        entry.cwd = action.payload.cwd;
      })
      .addCase(runTerminalCommand.rejected, (state, action) => {
        state.isRunning = false;
        const entry = state.entries.find(
          (item) => item.id === action.meta.requestId,
        );
        const payload = action.payload ?? {
          exitCode: 1,
          stderr: 'Command execution failed.',
          stdout: '',
          cwd: '',
        };

        if (!entry) {
          return;
        }

        entry.status = 'error';
        entry.exitCode = payload.exitCode;
        entry.stdout = payload.stdout;
        entry.stderr = payload.stderr;
        entry.cwd = payload.cwd;
      });
  },
});

export const { clearTerminalEntries, setDraftCommand } = terminalSlice.actions;

export default terminalSlice.reducer;
