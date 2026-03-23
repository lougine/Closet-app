import * as FileSystem from 'expo-file-system/legacy';

import { buildApiUrl, buildAuthHeaders } from '@/constants/api';

export type GarmentSearchImage = {
  imageUrl: string;
  sourceUrl?: string;
  title?: string;
};

type RemoveBackgroundSize = 'preview' | 'auto';

export class GarmentSearchError extends Error {
  status?: number;
  retryAfterSeconds?: number;

  constructor(message: string, status?: number, retryAfterSeconds?: number) {
    super(message);
    this.name = 'GarmentSearchError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const parseErrorPayload = async (response: Response, fallbackMessage: string) => {
  const status = response.status;
  const contentType = response.headers.get('content-type') || '';

  const withStatusHint = (baseMessage: string) => {
    if (status === 404) {
      return 'Search endpoint not found on backend. Restart the backend server and try again.';
    }
    return baseMessage;
  };

  try {
    if (!contentType.includes('application/json')) {
      const text = (await response.text()).trim();
      const message = text || fallbackMessage;
      throw new GarmentSearchError(withStatusHint(message), status);
    }

    const payload = (await response.json()) as { message?: string; retryAfterSeconds?: number };
    const message = typeof payload?.message === 'string' && payload.message.trim()
      ? payload.message
      : fallbackMessage;
    throw new GarmentSearchError(withStatusHint(message), status, payload?.retryAfterSeconds);
  } catch (error) {
    if (error instanceof GarmentSearchError) {
      throw error;
    }
    throw new GarmentSearchError(withStatusHint(fallbackMessage), status);
  }
};

const extensionFromMimeType = (mimeType: string) => {
  const lower = mimeType.toLowerCase();
  if (lower.includes('jpeg') || lower.includes('jpg')) return 'jpg';
  if (lower.includes('webp')) return 'webp';
  return 'png';
};

export async function searchGarmentImages(
  query: string,
  token: string,
  count = 10,
): Promise<GarmentSearchImage[]> {
  const response = await fetch(buildApiUrl('/api/garments/search-images'), {
    method: 'POST',
    headers: {
      ...buildAuthHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num: count }),
  });

  if (!response.ok) {
    await parseErrorPayload(response, 'Unable to search garment images right now.');
  }

  const payload = (await response.json()) as { images?: GarmentSearchImage[] };
  return Array.isArray(payload.images) ? payload.images : [];
}

export async function removeBackgroundFromImageUrl(
  imageUrl: string,
  token: string,
  size: RemoveBackgroundSize = 'preview',
): Promise<string> {
  const response = await fetch(buildApiUrl('/api/garments/remove-background-url'), {
    method: 'POST',
    headers: {
      ...buildAuthHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageUrl, size }),
  });

  if (!response.ok) {
    await parseErrorPayload(response, 'Unable to remove background from selected image.');
  }

  const payload = (await response.json()) as { base64?: string; mimeType?: string };
  if (!payload?.base64) {
    throw new GarmentSearchError('Background removal returned an empty response.');
  }

  const extension = extensionFromMimeType(payload.mimeType || 'image/png');
  const outputUri = `${FileSystem.documentDirectory}searched-garment-${Date.now()}.${extension}`;

  await FileSystem.writeAsStringAsync(outputUri, payload.base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return outputUri;
}
