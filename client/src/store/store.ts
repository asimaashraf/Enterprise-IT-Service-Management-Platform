import { configureStore } from '@reduxjs/toolkit'

// Root reducer - add slices here as Phase 1 modules are implemented
const rootReducer = {
  // auth: authSlice,
}

// Configure the Redux store with TypeScript support
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/setCredentials'],
      },
    }),
  devTools: import.meta.env.DEV,
})

// Infer types for use throughout the app
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
