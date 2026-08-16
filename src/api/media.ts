import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';

import { apiRequest } from './http';

export type MediaSourceType = 'trip_record' | 'gallery_upload';
export type SupportedMediaMime =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'video/mp4'
  | 'video/quicktime';

export type UploadedMedia = {
  mediaId: string;
  status: 'ready';
  uri: string | null;
  raw: Record<string, unknown>;
};

type UploadTarget = {
  mediaId: string;
  uploadUrl: string;
  headers: Record<string, string>;
};

const ALLOWED_MIMES = new Set<SupportedMediaMime>([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function readUploadTarget(payload: unknown): UploadTarget {
  const root = asRecord(payload);
  const media = asRecord(root?.media);
  const mediaId =
    asString(root?.mediaId) ?? asString(root?.id) ?? asString(media?.id);
  const uploadUrl =
    asString(root?.uploadUrl) ??
    asString(root?.presignedUrl) ??
    asString(root?.url);
  const headerSource = asRecord(root?.headers);
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(headerSource ?? {})) {
    const text = asString(value);
    if (text) headers[key] = text;
  }

  if (!mediaId || !uploadUrl) {
    throw new Error('미디어 업로드 URL 응답 형식이 올바르지 않습니다.');
  }
  return { mediaId, uploadUrl, headers };
}

function resolveMime(file: File, kind: 'photo' | 'video'): SupportedMediaMime {
  const reported = file.type.toLowerCase() as SupportedMediaMime;
  if (ALLOWED_MIMES.has(reported)) return reported;

  const extension = file.extension.toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.mov') return 'video/quicktime';
  if (extension === '.mp4' || kind === 'video') return 'video/mp4';
  return 'image/jpeg';
}

function readStatus(payload: Record<string, unknown>): string {
  const media = asRecord(payload.media);
  return (asString(payload.status) ?? asString(media?.status) ?? '').toLowerCase();
}

function readMediaUri(payload: Record<string, unknown>): string | null {
  const urls = asRecord(payload.urls);
  const media = asRecord(payload.media);
  const mediaUrls = asRecord(media?.urls);
  return (
    asString(urls?.detail) ??
    asString(urls?.original) ??
    asString(urls?.play) ??
    asString(mediaUrls?.detail) ??
    asString(mediaUrls?.original) ??
    asString(mediaUrls?.play) ??
    asString(payload.detailUrl) ??
    asString(payload.originalUrl) ??
    asString(payload.playUrl) ??
    asString(payload.url) ??
    null
  );
}

async function createUploadTarget(
  accessToken: string,
  input: {
    mime: SupportedMediaMime;
    bytes: number;
    sourceType: MediaSourceType;
    tripId: string;
  },
): Promise<UploadTarget> {
  const payload = await apiRequest<unknown>('/media/upload-url', {
    method: 'POST',
    accessToken,
    body: {
      mime: input.mime,
      bytes: input.bytes,
      sourceType: input.sourceType,
      tripId: Number(input.tripId),
    },
  });
  return readUploadTarget(payload);
}

export async function getMedia(
  accessToken: string,
  mediaId: string,
): Promise<Record<string, unknown>> {
  const payload = await apiRequest<unknown>(`/media/${mediaId}`, { accessToken });
  const record = asRecord(payload);
  if (!record) throw new Error('미디어 상태 응답 형식이 올바르지 않습니다.');
  return record;
}

export async function getMediaDisplayUri(
  accessToken: string,
  mediaId: string,
): Promise<string | null> {
  const payload = await getMedia(accessToken, mediaId);
  return readStatus(payload) === 'ready' ? readMediaUri(payload) : null;
}

export async function waitForMediaReady(
  accessToken: string,
  mediaId: string,
  options: { attempts?: number; intervalMs?: number } = {},
): Promise<UploadedMedia> {
  const attempts = options.attempts ?? 60;
  const intervalMs = options.intervalMs ?? 1000;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const payload = await getMedia(accessToken, mediaId);
    const status = readStatus(payload);
    if (status === 'ready') {
      return { mediaId, status: 'ready', uri: readMediaUri(payload), raw: payload };
    }
    if (status === 'failed') {
      throw new Error('미디어 처리에 실패했습니다. 다른 파일로 다시 시도해 주세요.');
    }
    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('미디어 처리가 지연되고 있습니다. 잠시 후 다시 시도해 주세요.');
}

export async function uploadMediaFile(
  accessToken: string,
  input: {
    uri: string;
    kind: 'photo' | 'video';
    sourceType: MediaSourceType;
    tripId: string;
  },
): Promise<UploadedMedia> {
  const file = new File(input.uri);
  if (!file.exists || file.size < 1) {
    throw new Error('업로드할 파일을 읽을 수 없습니다.');
  }

  const mime = resolveMime(file, input.kind);
  const target = await createUploadTarget(accessToken, {
    mime,
    bytes: file.size,
    sourceType: input.sourceType,
    tripId: input.tripId,
  });

  const uploadResponse = await expoFetch(target.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mime,
      ...target.headers,
    },
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error(`파일 업로드에 실패했습니다. (${uploadResponse.status})`);
  }

  await apiRequest<unknown>(`/media/${target.mediaId}/complete`, {
    method: 'POST',
    accessToken,
  });
  return waitForMediaReady(accessToken, target.mediaId);
}

export async function setMediaCrop(
  accessToken: string,
  mediaId: string,
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
    rotation: number;
  },
): Promise<unknown> {
  return apiRequest<unknown>(`/media/${mediaId}/crop`, {
    method: 'PATCH',
    accessToken,
    body: crop,
  });
}
