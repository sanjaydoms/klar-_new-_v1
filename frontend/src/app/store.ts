// app/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web
import { combineReducers } from 'redux';
import authReducer from '../features/authentication/authSlice';
import walletReducer from '../features/wallet/walletSlice';

// Configuration for redux-persist
const persistConfig = {
  key: 'root', // key for the persist storage
  storage, // storage engine (localStorage)
  whitelist: ['auth'], // only auth reducer will be persisted
  blacklist: [], // reducers we don't want to persist
};

// Combine reducers
const rootReducer = combineReducers({
  auth: authReducer,
  wallet: walletReducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types from redux-persist
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

// Create persistor
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
