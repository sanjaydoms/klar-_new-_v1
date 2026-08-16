// main.tsx
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './app/store';
import { AppRouter } from './routes';
import './styles/index.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LoaderStyles } from './components/FlightCommon/FlightLoader';
import { TooltipProvider } from '@/components/ui/tooltip';
import { GlobalToasts } from './utils/notify';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

console.log("Google Client ID:", GOOGLE_CLIENT_ID);

createRoot(document.getElementById('root')!).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <Provider store={store}>
      <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
        <TooltipProvider>
          <LoaderStyles />
          <GlobalToasts />
          <AppRouter />
        </TooltipProvider>
      </PersistGate>
    </Provider>
  </GoogleOAuthProvider>
);
