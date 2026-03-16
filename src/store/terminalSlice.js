import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { executeTerminalCommand } from '../lib/terminalApi';

const EXAMPLE_COMMANDS = [
  'dbt --version',
  'dbt run --select "customers"',
  'dbt seed',
  'dbt test --exclude "myTest"',
  'dbt snapshot',
  'dbt build',
  'dbt compile',
];

const initialState = {
  projectPath: '',
  draftCommand: EXAMPLE_COMMANDS[0],
  isRunning: false,
  examples: EXAMPLE_COMMANDS,
  entries: [],
};

export const runTerminalCommand = createAsyncThunk(
  'terminal/runTerminalCommand',
  async (_, { getState, rejectWithValue }) => {
    const state = getState().terminal;

    try {
      return await executeTerminalCommand({
        commandText: state.draftCommand,
        projectPath: state.projectPath,
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
        cwd: state.projectPath?.trim() || '',
        commandText: state.draftCommand,
      });
    }
  },
);

const terminalSlice = createSlice({
  name: 'terminal',
  initialState,
  reducers: {
    setProjectPath(state, action) {
      state.projectPath = action.payload;
    },
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
          cwd: state.projectPath?.trim() || '',
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
          cwd: state.projectPath?.trim() || '',
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

export const { clearTerminalEntries, setDraftCommand, setProjectPath } =
  terminalSlice.actions;

export default terminalSlice.reducer;
