import { Platform } from 'react-native';

// Local dev server config
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

// Update this to your production API when deploying.
export const API_BASE_URL = __DEV__
  ? `http://${DEV_HOST}:5000`
  : 'https://your-production-backend.com';

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function buildAuthHeaders(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
