import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') {
    return config;
  }

  const token = window.localStorage.getItem('token');

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function getApiErrorMessage(error, fallbackMessage = 'Une erreur est survenue.') {
  const validationMessage =
    error?.response?.data?.errors?.[0]?.message ||
    error?.response?.data?.errors?.[0]?.msg;

  return validationMessage || error?.response?.data?.message || fallbackMessage;
}

export default api;
