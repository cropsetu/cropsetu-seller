import axios from 'axios';
import { setItem, getItem, deleteItem } from '../utils/storage';
import { API_BASE_URL, STORAGE_KEYS } from '../constants/config';

export async function saveTokens({ accessToken, refreshToken, userId }) {
  await Promise.all([
    setItem(STORAGE_KEYS.ACCESS_TOKEN,   accessToken),
    setItem(STORAGE_KEYS.REFRESH_TOKEN,  refreshToken),
    setItem(STORAGE_KEYS.USER_ID,        String(userId)),
    setItem(STORAGE_KEYS.TOKEN_SAVED_AT, String(Date.now())),
  ]);
}

export async function clearTokens() {
  await Promise.all([
    deleteItem(STORAGE_KEYS.ACCESS_TOKEN),
    deleteItem(STORAGE_KEYS.REFRESH_TOKEN),
    deleteItem(STORAGE_KEYS.USER_ID),
    deleteItem(STORAGE_KEYS.TOKEN_SAVED_AT),
  ]);
}

export const getAccessToken  = () => getItem(STORAGE_KEYS.ACCESS_TOKEN);
export const getRefreshToken = () => getItem(STORAGE_KEYS.REFRESH_TOKEN);
export const getUserId       = () => getItem(STORAGE_KEYS.USER_ID);

/**
 * Returns a safe, generic error message for display to users.
 * Never exposes raw server responses or stack traces.
 * Accepts an optional translate function `t` to return localized messages.
 */
export function safeErrorMessage(error, fallbackOrT, t) {
  const fallback = typeof fallbackOrT === 'function' ? undefined : fallbackOrT;
  const translate = typeof fallbackOrT === 'function' ? fallbackOrT : t;
  const status = error?.response?.status;

  if (translate) {
    const keyMap = {
      400: 'apiError.badRequest',
      401: 'apiError.sessionExpired',
      403: 'apiError.permissionDenied',
      404: 'apiError.notFound',
      409: 'apiError.conflict',
      422: 'apiError.invalidData',
      429: 'apiError.tooManyRequests',
      500: 'apiError.serverError',
      503: 'apiError.serviceUnavailable',
    };
    const key = keyMap[status];
    if (key) return translate(key);
    return fallback || translate('apiError.generic');
  }

  const map = {
    400: 'Invalid request. Please check your input.',
    401: 'Session expired. Please log in again.',
    403: 'Permission denied.',
    404: 'The requested resource was not found.',
    409: 'This action conflicts with existing data.',
    422: 'Invalid data submitted.',
    429: 'Too many requests. Please wait a moment.',
    500: 'Server error. Please try again later.',
    503: 'Service unavailable. Please try again later.',
  };
  return map[status] ?? (fallback || 'Something went wrong. Please try again.');
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// When sending FormData (file uploads), remove Content-Type so React Native's
// XHR sets the correct multipart/form-data boundary itself.
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    config.headers.delete('Content-Type');
  }
  return config;
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue  = [];

function processQueue(error, token = null) {
  failedQueue.forEach((p) => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) return Promise.reject(error);

    if (isRefreshing) {
      return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
        .then((token) => { original.headers.Authorization = `Bearer ${token}`; return api(original); });
    }

    original._retry = true;
    isRefreshing    = true;

    try {
      const [refreshToken, userId] = await Promise.all([getRefreshToken(), getUserId()]);
      if (!refreshToken || !userId) throw new Error('No refresh token');

      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { userId, refreshToken });
      await saveTokens({ accessToken: data.data.accessToken, refreshToken: data.data.refreshToken, userId });
      processQueue(null, data.data.accessToken);
      original.headers.Authorization = `Bearer ${data.data.accessToken}`;
      return api(original);
    } catch (err) {
      processQueue(err, null);
      await clearTokens();
      return Promise.reject({ ...err, sessionExpired: true });
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
