// Local dev server config
const LAN_IP = '172.17.17.171';
const DEV_HOST = LAN_IP;

// Update this to your production API when deploying.
export const API_BASE_URL = __DEV__
  ? `http://${DEV_HOST}:5000`
  : 'https://your-production-backend.com';

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function buildAuthHeaders(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
