import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Local dev server config.
// Override with EXPO_PUBLIC_DEV_HOST for physical devices on LAN.
const DEV_HOST = process.env.EXPO_PUBLIC_DEV_HOST
  || (Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1');

// Update this to your production API when deploying.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || (__DEV__
  ? `http://${DEV_HOST}:5000`
  : 'https://your-production-backend.com');

const DEFAULT_API_TIMEOUT_MS = 12000;
const DEFAULT_API_RETRIES = 1;

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '');

const withDefaultPort = (host: string) => {
  const trimmed = host.trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return normalizeBaseUrl(trimmed);
  }

  return `http://${trimmed}:5000`;
};

export function getApiBaseUrlCandidates(): string[] {
  const candidates: string[] = [];
  const addCandidate = (value?: string | null) => {
    if (!value) return;
    const normalized = withDefaultPort(value);
    if (!normalized) return;
    if (!candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  const expoHostUri = Constants.expoConfig?.hostUri
    || (Constants as any)?.manifest2?.extra?.expoClient?.hostUri
    || (Constants as any)?.manifest?.debuggerHost;
  if (typeof expoHostUri === 'string' && expoHostUri.trim()) {
    const hostOnly = expoHostUri.replace(/^https?:\/\//i, '').split('/')[0];
    const hostName = hostOnly.split(':')[0];
    addCandidate(hostName);
    addCandidate(hostOnly);
  }

  addCandidate(API_BASE_URL);

  if (__DEV__) {
    addCandidate(process.env.EXPO_PUBLIC_API_BASE_URL);
    addCandidate(process.env.EXPO_PUBLIC_DEV_HOST);
    if (Platform.OS === 'android') {
      addCandidate('10.0.2.2');
    }
    addCandidate('127.0.0.1');
    addCandidate('localhost');
  }

  return candidates;
}

type ApiFallbackOptions = {
  timeoutMs?: number;
  retries?: number;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableNetworkError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError') return true;
  return /network request timed out|network request failed|failed to fetch/i.test(error.message);
};

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

export async function fetchApiWithFallback(
  path: string,
  init: RequestInit = {},
  options: ApiFallbackOptions = {},
): Promise<Response> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const timeoutMs = options.timeoutMs ?? DEFAULT_API_TIMEOUT_MS;
  const retries = Math.max(0, options.retries ?? DEFAULT_API_RETRIES);
  const baseUrls = getApiBaseUrlCandidates();
  const maxAttempts = retries + 1;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    for (const baseUrl of baseUrls) {
      try {
        return await fetchWithTimeout(`${baseUrl}${normalizedPath}`, init, timeoutMs);
      } catch (error) {
        lastError = error;
        if (!isRetryableNetworkError(error)) {
          throw error;
        }
      }
    }

    if (attempt < maxAttempts) {
      await delay(300 * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Network request failed for all configured API hosts.');
}

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
