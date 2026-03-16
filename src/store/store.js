import { configureStore } from '@reduxjs/toolkit';
import adapterSetupReducer from './adapterSetupSlice';
import projectReducer from './projectSlice';
import terminalReducer from './terminalSlice';

export const store = configureStore({
  reducer: {
    adapterSetup: adapterSetupReducer,
    project: projectReducer,
    terminal: terminalReducer,
  },
});
