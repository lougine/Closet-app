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
  if (!imagePath) return imagePath;

  if (/^https?:\/\//i.test(imagePath)) {
    const legacyUploadMatch = imagePath.match(/\/uploads\/([^/?#]+)/i);
    if (legacyUploadMatch?.[1]) {
      return buildApiUrl(`/api/uploads/${legacyUploadMatch[1]}`);
    }

    const protectedMatch = imagePath.match(/\/api\/uploads\/([^/?#]+)/i);
    if (protectedMatch?.[1]) {
      return buildApiUrl(`/api/uploads/${protectedMatch[1]}`);
    }

    return imagePath;
  }

  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;

  if (normalizedPath.startsWith('/api/uploads/')) {
    return buildApiUrl(normalizedPath);
  }

  if (normalizedPath.startsWith('/uploads/')) {
    const filename = normalizedPath.split('/').filter(Boolean).pop();
    return filename ? buildApiUrl(`/api/uploads/${filename}`) : buildApiUrl(normalizedPath);
  }

  return buildApiUrl(normalizedPath);
}

export function buildAuthHeaders(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
