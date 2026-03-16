import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  fetchSetupStatus,
  saveSetupConfig,
  testSetupConfig,
} from '../lib/setupApi';

const initialState = {
  isOpen: false,
  isLoadingStatus: false,
  isSaving: false,
  isTesting: false,
  status: null,
  saveMessage: '',
  saveStatus: 'idle',
  testResult: null,
  testStatus: 'idle',
  error: '',
  form: {
    adapterType: 'fabric',
    profileName: '',
    targetName: 'dev',
    projectPath: '',
    threads: 4,
    authentication: 'cli',
    driver: 'ODBC Driver 18 for SQL Server',
    server: '',
    database: '',
    schema: '',
    tenantId: '',
    clientId: '',
    clientSecret: '',
    host: '',
    port: '5432',
    user: '',
    password: '',
  },
};

const initialFormState = initialState.form;

function findMatchingConfig(savedConfigs = [], adapterType, profileName) {
  if (!adapterType || !profileName) {
    return null;
  }

  return (
    savedConfigs.find(
      (config) =>
        config.adapterType === adapterType && config.profileName === profileName,
    ) || null
  );
}

function mergeFormWithSavedConfig(form, savedConfig) {
  return {
    ...form,
    ...savedConfig,
    password: '',
    clientSecret: '',
  };
}

function getConfigSelectionValue(config) {
  return `${config.adapterType}::${config.profileName}`;
}

function buildFreshForm(previousForm) {
  return {
    ...initialFormState,
    profileName: previousForm.profileName || '',
    projectPath: previousForm.projectPath || '',
  };
}

export const loadSetupStatus = createAsyncThunk(
  'adapterSetup/loadStatus',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchSetupStatus();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Unable to load setup status.',
      );
    }
  },
);

export const saveAdapterSetup = createAsyncThunk(
  'adapterSetup/save',
  async (_, { getState, rejectWithValue }) => {
    try {
      const form = getState().adapterSetup.form;
      return await saveSetupConfig(form);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Unable to save adapter setup.',
      );
    }
  },
);

export const testAdapterSetup = createAsyncThunk(
  'adapterSetup/test',
  async (_, { getState, rejectWithValue }) => {
    try {
      const form = getState().adapterSetup.form;
      return await testSetupConfig(form);
    } catch (error) {
      if (error?.payload) {
        return rejectWithValue(error.payload);
      }

      return rejectWithValue(
        error instanceof Error ? error.message : 'dbt debug failed.',
      );
    }
  },
);

const adapterSetupSlice = createSlice({
  name: 'adapterSetup',
  initialState,
  reducers: {
    toggleSetupPanel(state) {
      state.isOpen = !state.isOpen;
    },
    closeSetupPanel(state) {
      state.isOpen = false;
    },
    loadSavedSetupConfig(state, action) {
      const selectedValue = action.payload;
      state.saveMessage = '';
      state.saveStatus = 'idle';
      if (!selectedValue) {
        state.form = buildFreshForm(state.form);
        return;
      }

      const matchingConfig =
        state.status?.savedConfigs?.find(
          (config) => getConfigSelectionValue(config) === selectedValue,
        ) || null;

      if (matchingConfig) {
        state.form = mergeFormWithSavedConfig(state.form, matchingConfig);
      }
    },
    updateSetupField(state, action) {
      const { field, value } = action.payload;
      state.form[field] = value;
      state.saveMessage = '';
      state.saveStatus = 'idle';

      if (field !== 'adapterType' && field !== 'profileName') {
        return;
      }

      const nextAdapterType =
        field === 'adapterType' ? value : state.form.adapterType;
      const nextProfileName =
        field === 'profileName' ? value : state.form.profileName;
      const matchingConfig = findMatchingConfig(
        state.status?.savedConfigs,
        nextAdapterType,
        nextProfileName,
      );

      if (matchingConfig) {
        state.form = mergeFormWithSavedConfig(state.form, matchingConfig);
      }
    },
    syncProjectDefaults(state, action) {
      const { profileName, projectName } = action.payload;
      if (!state.form.profileName && profileName) {
        state.form.profileName = profileName;
      }

      const matchingConfig = findMatchingConfig(
        state.status?.savedConfigs,
        state.form.adapterType,
        state.form.profileName,
      );

      if (matchingConfig) {
        state.form = mergeFormWithSavedConfig(state.form, matchingConfig);
      }

      const savedProjectPath =
        matchingConfig?.projectPath || state.status?.savedConfig?.projectPath || '';
      const savedProjectName =
        savedProjectPath.split('/').filter(Boolean).pop() || '';

      if (
        !state.form.projectPath &&
        projectName &&
        savedProjectPath &&
        savedProjectName === projectName
      ) {
        state.form.projectPath = savedProjectPath;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSetupStatus.pending, (state) => {
        state.isLoadingStatus = true;
        state.error = '';
      })
      .addCase(loadSetupStatus.fulfilled, (state, action) => {
        state.isLoadingStatus = false;
        state.status = action.payload;
        const matchingConfig = findMatchingConfig(
          action.payload.savedConfigs,
          state.form.adapterType,
          state.form.profileName,
        );
        const selectedConfig = matchingConfig || action.payload.savedConfig;

        if (selectedConfig) {
          state.form = mergeFormWithSavedConfig(state.form, selectedConfig);
        }
      })
      .addCase(loadSetupStatus.rejected, (state, action) => {
        state.isLoadingStatus = false;
        state.error = action.payload;
      })
      .addCase(saveAdapterSetup.pending, (state) => {
        state.isSaving = true;
        state.error = '';
        state.saveMessage = '';
        state.saveStatus = 'running';
      })
      .addCase(saveAdapterSetup.fulfilled, (state, action) => {
        state.isSaving = false;
        state.status = action.payload.status;
        state.form = mergeFormWithSavedConfig(state.form, action.payload.savedConfig);
        state.saveMessage = `Saved ${action.payload.savedConfig.adapterType} / ${action.payload.savedConfig.profileName}`;
        state.saveStatus = 'success';
      })
      .addCase(saveAdapterSetup.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload;
        state.saveMessage =
          typeof action.payload === 'string'
            ? action.payload
            : 'Unable to save adapter setup.';
        state.saveStatus = 'error';
      })
      .addCase(testAdapterSetup.pending, (state) => {
        state.isTesting = true;
        state.error = '';
        state.testResult = null;
        state.testStatus = 'running';
      })
      .addCase(testAdapterSetup.fulfilled, (state, action) => {
        state.isTesting = false;
        state.testResult = action.payload;
        state.testStatus = action.payload.ok ? 'success' : 'warning';
      })
      .addCase(testAdapterSetup.rejected, (state, action) => {
        state.isTesting = false;
        const payload =
          typeof action.payload === 'string'
            ? {
                ok: false,
                stderr: action.payload,
                stdout: '',
              }
            : action.payload;
        state.testResult = payload;
        state.error =
          typeof action.payload === 'string'
            ? action.payload
            : action.payload?.error || action.payload?.stderr || 'dbt debug failed.';
        state.testStatus = 'error';
      });
  },
});

export const {
  closeSetupPanel,
  loadSavedSetupConfig,
  toggleSetupPanel,
  updateSetupField,
  syncProjectDefaults,
} = adapterSetupSlice.actions;

export default adapterSetupSlice.reducer;
