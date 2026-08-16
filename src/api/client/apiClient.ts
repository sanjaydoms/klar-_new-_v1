import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { config } from '../../config/env.config';

/**
 * Create and configure axios instance
 */
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: config.apiBaseUrl,
    timeout: config.apiTimeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return instance;
};

export const apiClient = createAxiosInstance();

/**
 * Request logger for development
 */
export const logRequest = (reqConfig: InternalAxiosRequestConfig) => {
  if (config.enableLogging) {
    console.log('🚀 API Request:', {
      method: reqConfig.method?.toUpperCase(),
      url: reqConfig.url,
      params: reqConfig.params,
      data: reqConfig.data,
    });
  }
  return reqConfig;
};

/**
 * Response logger for development
 */
export const logResponse = (response: AxiosResponse) => {
  if (config.enableLogging) {
  }
  return response;
};

/**
 * Error logger
 */
export const logError = (error: any) => {
  if (config.enableLogging) {
    console.error('❌ API Error:', {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data,
    });
  }
  return Promise.reject(error);
};
