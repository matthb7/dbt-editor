import { configureStore } from '@reduxjs/toolkit';
import projectReducer from './projectSlice';
import terminalReducer from './terminalSlice';

export const store = configureStore({
  reducer: {
    project: projectReducer,
    terminal: terminalReducer,
  },
});
