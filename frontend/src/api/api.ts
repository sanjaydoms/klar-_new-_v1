import axios from 'axios';
import { setupInterceptors } from './interceptors';

const API = axios.create({
  baseURL: (import.meta.env.VITE_BACKEND_AUTH_URL || 'http://localhost:5010').replace(/\/$/, ''),
  // timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    apikey: import.meta.env.VITE_BACKEND_TRIPJACK_API_KEY,
  },
});

// Attach interceptors
setupInterceptors(API);

export default API;
