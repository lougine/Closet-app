import { buildApiUrl, buildAuthHeaders } from '@/constants/api';

const DEFAULT_TIMEOUT_MS = 25000;
const DEFAULT_RETRY_COUNT = 1;

export type UploadFailureCode =
  | 'auth'
  | 'validation'
  | 'too_large'
  | 'timeout'
  | 'network'
  | 'server'
  | 'unknown';

export class UploadRequestError extends Error {
  code: UploadFailureCode;
  status?: number;
  constructor(message: string, code: UploadFailureCode, status?: number) {
    super(message);
    this.name = 'UploadRequestError';
    this.code = code;
    this.status = status;
  }
}

type MultipartUploadOptions = {
  endpoint: string;
  token: string;
  formData: FormData;
  method?: 'POST' | 'PUT' | 'PATCH';
  timeoutMs?: number;
  retries?: number;
  fallbackMessage?: string;
};

const parseErrorPayload = async (res: Response, fallbackMessage: string) => {
  const errorBody = await res.json().catch(() => null);
  const message =
    (errorBody && typeof errorBody.message === 'string' && errorBody.message) ||
    fallbackMessage;

  if (res.status === 401) {
    throw new UploadRequestError(message || 'Session expired. Please log in again.', 'auth', res.status);
  }

  if (res.status === 413) {
    throw new UploadRequestError(message || 'Image is too large.', 'too_large', res.status);
  }

  if (res.status >= 400 && res.status < 500) {
    throw new UploadRequestError(message || 'Invalid image upload request.', 'validation', res.status);
  }

  if (res.status >= 500) {
    throw new UploadRequestError(message || 'Server error while uploading image.', 'server', res.status);
  }

  throw new UploadRequestError(message || fallbackMessage, 'unknown', res.status);
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error: unknown) => {
  if (error instanceof UploadRequestError) {
    return error.code === 'timeout' || error.code === 'network' || error.code === 'server';
  }

  return false;
};

const normalizeUploadError = (error: unknown, fallbackMessage: string) => {
  if (error instanceof UploadRequestError) {
    return error;
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return new UploadRequestError('Upload timed out. Please try again.', 'timeout');
  }

  if (error instanceof Error) {
    if (/network request failed/i.test(error.message) || /failed to fetch/i.test(error.message)) {
      return new UploadRequestError('Network issue while uploading. Check your connection and retry.', 'network');
    }

    return new UploadRequestError(error.message || fallbackMessage, 'unknown');
  }

  return new UploadRequestError(fallbackMessage, 'unknown');
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

export async function uploadMultipartWithRetry<T>(options: MultipartUploadOptions): Promise<T> {
  const {
    endpoint,
    token,
    formData,
    method = 'PUT',
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRY_COUNT,
    fallbackMessage = 'Image upload failed.',
  } = options;

  const maxAttempts = Math.max(1, retries + 1);
  let latestError: UploadRequestError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(buildApiUrl(endpoint), {
        method,
        headers: buildAuthHeaders(token),
        body: formData,
      }, timeoutMs);

      if (!response.ok) {
        await parseErrorPayload(response, fallbackMessage);
      }

      return await response.json();
    } catch (error) {
      const normalizedError = normalizeUploadError(error, fallbackMessage);
      latestError = normalizedError;

      if (attempt >= maxAttempts || !isRetryableError(normalizedError)) {
        throw normalizedError;
      }

      await delay(250 * attempt);
    }
  }

  throw latestError || new UploadRequestError(fallbackMessage, 'unknown');
}

export function getUploadErrorMessage(error: unknown, fallbackMessage: string) {
  const normalized = normalizeUploadError(error, fallbackMessage);
  return normalized.message || fallbackMessage;
}
