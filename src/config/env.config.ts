// Environment configuration
interface EnvConfig {
  searchApiUrl: string;
  bookingApiUrl: string;
  apiTimeout: number;
  environment: 'development' | 'staging' | 'production';
  enableLogging: boolean;
  dashboardSearchEnabled: boolean;
  enableMarkups: boolean;
}

const getEnvConfig = (): EnvConfig => {
  const env = import.meta.env;

  if (env.MODE === 'development' || env.VITE_ENABLE_LOGGING === 'true') {
    console.log('🌐 Environment variables loaded:', {
      VITE_SEARCH_API_URL: env.VITE_SEARCH_API_URL,
      VITE_BOOKING_API_URL: env.VITE_BOOKING_API_URL,
      MODE: env.MODE,
    });
  }

  return {
    // Directly connect frontend to backend ports, bypassing Vite proxy entirely
    searchApiUrl: (env.VITE_SEARCH_API_URL || 'http://localhost:5012').replace(
      /\/api\/search\/?$/,
      '',
    ),
    bookingApiUrl: (env.VITE_BOOKING_API_URL || 'http://localhost:5013').replace(
      /\/api\/booking\/?$/,
      '',
    ),
    apiTimeout: Number(env.VITE_API_TIMEOUT) || 30000,
    environment: (env.VITE_ENVIRONMENT as EnvConfig['environment']) || 'development',
    enableLogging: env.VITE_ENABLE_LOGGING === 'true' || env.MODE === 'development',
    dashboardSearchEnabled: env.VITE_DASHBOARD_SEARCH === 'true',
    enableMarkups: true, // Forcing to true to bypass old cached .env values in the running dev server
  };
};

export const config = getEnvConfig();
