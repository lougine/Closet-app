import * as FileSystem from "expo-file-system";

const REMOVE_BG_API_URL = "https://api.remove.bg/v1.0/removebg";
const REMOVE_BG_API_KEY = process.env.EXPO_PUBLIC_REMOVE_BG_API_KEY;

type RemoveBackgroundOptions = {
  sourceHeaders?: Record<string, string>;
  filename?: string;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const view = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < view.byteLength; i++) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary);
};

const inferExtensionFromUri = (uri: string) => {
  const cleaned = uri.split("?")[0] || "";
  const ext = cleaned.split(".").pop()?.toLowerCase();
  if (ext === "png" || ext === "webp" || ext === "jpg" || ext === "jpeg") {
    return ext === "jpeg" ? "jpg" : ext;
  }
  return "jpg";
};

const mimeTypeFromExtension = (ext: string) => {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
};

const ensureLocalImageUri = async (sourceUri: string, sourceHeaders?: Record<string, string>) => {
  if (sourceUri.startsWith("file://")) {
    return sourceUri;
  }

  const ext = inferExtensionFromUri(sourceUri);
  const downloadUri = `${FileSystem.cacheDirectory}removebg-source-${Date.now()}.${ext}`;
  const result = await FileSystem.downloadAsync(sourceUri, downloadUri, {
    headers: sourceHeaders,
  });

  if (result.status !== 200) {
    throw new Error("Unable to access the selected image.");
  }

  return result.uri;
};

const parseRemoveBgErrorMessage = async (response: Response) => {
  const fallback = "Background removal failed. Please try again.";

  try {
    const payload = await response.json();
    const firstError = Array.isArray(payload?.errors) ? payload.errors[0] : null;
    if (typeof firstError?.title === "string" && firstError.title.trim()) {
      return firstError.title;
    }
    if (typeof payload?.message === "string" && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    // Ignore parse errors and use fallback.
  }

  return fallback;
};

const inferExtension = (mimeType: string) => {
  const lower = mimeType.toLowerCase();
  if (lower.includes("jpeg") || lower.includes("jpg")) return "jpg";
  if (lower.includes("webp")) return "webp";
  return "png";
};

export async function removeBackgroundFromImageUri(
  sourceUri: string,
  options?: RemoveBackgroundOptions,
): Promise<string> {
  if (!REMOVE_BG_API_KEY) {
    throw new Error("Background removal API key is missing. Set EXPO_PUBLIC_REMOVE_BG_API_KEY.");
  }

  const localSourceUri = await ensureLocalImageUri(sourceUri, options?.sourceHeaders);
  const localExt = inferExtensionFromUri(localSourceUri);

  const formData = new FormData();
  formData.append("image_file", {
    uri: localSourceUri,
    name: options?.filename || `removebg-${Date.now()}.${localExt}`,
    type: mimeTypeFromExtension(localExt),
  } as any);
  formData.append("size", "auto");

  const removeBgResponse = await fetch(REMOVE_BG_API_URL, {
    method: "POST",
    headers: {
      "X-Api-Key": REMOVE_BG_API_KEY,
    },
    body: formData,
  });

  if (!removeBgResponse.ok) {
    const message = await parseRemoveBgErrorMessage(removeBgResponse);
    throw new Error(message);
  }

  const mimeType = removeBgResponse.headers.get("content-type") || "image/png";
  const arrayBuffer = await removeBgResponse.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  const extension = inferExtension(mimeType);
  const outputUri = `${FileSystem.cacheDirectory}removebg-${Date.now()}.${extension}`;

  await FileSystem.writeAsStringAsync(outputUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return outputUri;
}