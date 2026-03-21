export const IMAGE_UPLOAD_ASPECT = {
  profile: [1, 1] as [number, number],
  banner: [16, 7] as [number, number],
  garment: [3, 4] as [number, number],
};

const DEFAULT_MAX_UPLOAD_MB = 5;

const parsePositiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

export const IMAGE_UPLOAD_MAX_MB = parsePositiveNumber(
  process.env.EXPO_PUBLIC_IMAGE_UPLOAD_MAX_MB,
  DEFAULT_MAX_UPLOAD_MB,
);

const IMAGE_UPLOAD_LIMIT_LABEL = `${IMAGE_UPLOAD_MAX_MB}MB`;

export const IMAGE_UPLOAD_QUALITY = {
  profile: 0.8,
  banner: 0.85,
  garment: 0.7,
  itemDetail: 0.8,
};

export const IMAGE_UPLOAD_MAX_BYTES = {
  profile: Math.round(IMAGE_UPLOAD_MAX_MB * 1024 * 1024),
  banner: Math.round(IMAGE_UPLOAD_MAX_MB * 1024 * 1024),
  garment: Math.round(IMAGE_UPLOAD_MAX_MB * 1024 * 1024),
  itemDetail: Math.round(IMAGE_UPLOAD_MAX_MB * 1024 * 1024),
};

export const IMAGE_UPLOAD_SIZE_MESSAGES = {
  profile: {
    title: 'Profile image too large',
    body: `Please choose a profile image that is ${IMAGE_UPLOAD_LIMIT_LABEL} or smaller.`,
  },
  banner: {
    title: 'Banner image too large',
    body: `Please choose a banner image that is ${IMAGE_UPLOAD_LIMIT_LABEL} or smaller.`,
  },
  garment: {
    title: 'Image too large',
    body: `Please choose an image that is ${IMAGE_UPLOAD_LIMIT_LABEL} or smaller.`,
  },
  itemDetail: {
    title: 'Image too large',
    body: `Please choose an image that is ${IMAGE_UPLOAD_LIMIT_LABEL} or smaller.`,
  },
};

export type ImageUploadKind = keyof typeof IMAGE_UPLOAD_MAX_BYTES;

export function validateImageFileSize(fileSize: number | null | undefined, kind: ImageUploadKind) {
  if (!fileSize) {
    return null;
  }

  if (fileSize <= IMAGE_UPLOAD_MAX_BYTES[kind]) {
    return null;
  }

  return IMAGE_UPLOAD_SIZE_MESSAGES[kind];
}
