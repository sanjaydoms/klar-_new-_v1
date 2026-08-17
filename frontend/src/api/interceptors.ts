import {
  setItemWithTTL,
  getItemWithTTL,
  removeItem as removeTTLItem,
} from '@/utils/localStorageWithTTL';
import { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export const setupInterceptors = (axiosInstance: AxiosInstance): void => {
  axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getItemWithTTL('token');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error: AxiosError) => Promise.reject(error),
  );

  axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      // Don't redirect if:
      // 1. It's the session check endpoint (/me)
      // 2. It's the login request itself (/login)
      // 3. We are already on the login page
      // 4. The user is a guest (no token) — they were never logged in
      const isMeEndpoint = error.config?.url?.includes('/me');
      const isLoginRequest = error.config?.url?.includes('/b2b');
      const isLoginPage = window.location.pathname.includes('/b2b');
      const hasToken = !!getItemWithTTL('token');

      if (error.response?.status === 401 && !isMeEndpoint && !isLoginRequest && !isLoginPage && hasToken) {
        removeTTLItem('token');
        window.location.href = '/b2b';
      }
      return Promise.reject(error);
    },
  );
};
