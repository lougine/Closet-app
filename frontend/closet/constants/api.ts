import { Platform } from 'react-native';

// Local dev server config
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : '10.181.7.13';

// Update this to your production API when deploying.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || (__DEV__
  ? `http://${DEV_HOST}:5000`
  : 'https://your-production-backend.com');

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function buildImageUrl(imagePath: string) {
  // Remove leading slash if present since buildApiUrl adds it
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  return buildApiUrl(cleanPath);
}

export function buildAuthHeaders(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
