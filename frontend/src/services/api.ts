import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { authStorage, TokenPair } from './authStorage';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

let refreshRequest: Promise<string> | null = null;

api.interceptors.request.use((config) => {
  const token = authStorage.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    if (error.response?.status !== 401 || !config || config._retry) {
      return Promise.reject(error);
    }

    const refresh = authStorage.getRefresh();
    if (!refresh || config.url?.includes('/auth/token/')) {
      authStorage.clear();
      window.dispatchEvent(new Event('sales:auth-expired'));
      return Promise.reject(error);
    }

    config._retry = true;
    try {
      if (!refreshRequest) {
        refreshRequest = axios
          .post<TokenPair>(`${baseURL}/auth/token/refresh/`, { refresh })
          .then(({ data }) => {
            const updated = { access: data.access, refresh: data.refresh || refresh };
            authStorage.save(updated);
            return updated.access;
          })
          .finally(() => {
            refreshRequest = null;
          });
      }

      const access = await refreshRequest;
      config.headers.Authorization = `Bearer ${access}`;
      return await api(config);
    } catch (refreshError) {
      authStorage.clear();
      window.dispatchEvent(new Event('sales:auth-expired'));
      return Promise.reject(refreshError);
    }
  },
);
