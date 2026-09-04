import type {
  DecorPhotoLayer,
  DecorSticker,
  DecorTextLayer,
} from '../types/diary';

export type DecorLayerKind = 'photo' | 'text' | 'sticker';

export type DecorLayerBundle = {
  photos: DecorPhotoLayer[];
  texts: DecorTextLayer[];
  stickers: DecorSticker[];
};

export type SortedDecorItem =
  | { kind: 'photo'; layer: DecorPhotoLayer }
  | { kind: 'text'; layer: DecorTextLayer }
  | { kind: 'sticker'; layer: DecorSticker };

type ZItem = { kind: DecorLayerKind; id: string; zIndex: number; tie: number };

function readZ(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * 구데이터 호환: z가 하나도 없으면 사진 → 텍스트 → 스티커 순으로 1…
 * 일부만 있으면 있는 값은 유지하고 없는 것만 max+1부터 채움.
 */
export function ensureDecorLayerZIndexes(bundle: DecorLayerBundle): DecorLayerBundle {
  const hasAny = [...bundle.photos, ...bundle.texts, ...bundle.stickers].some(
    (item) => typeof item.zIndex === 'number' && Number.isFinite(item.zIndex),
  );

  if (!hasAny) {
    let z = 1;
    return {
      photos: bundle.photos.map((item) => ({ ...item, zIndex: z++ })),
      texts: bundle.texts.map((item) => ({ ...item, zIndex: z++ })),
      stickers: bundle.stickers.map((item) => ({ ...item, zIndex: z++ })),
    };
  }

  let max = 0;
  for (const item of [...bundle.photos, ...bundle.texts, ...bundle.stickers]) {
    if (typeof item.zIndex === 'number' && Number.isFinite(item.zIndex)) {
      max = Math.max(max, Math.trunc(item.zIndex));
    }
  }
  let next = max + 1;
  const fill = <T extends { zIndex?: number }>(item: T): T => {
    if (typeof item.zIndex === 'number' && Number.isFinite(item.zIndex)) {
      return { ...item, zIndex: Math.trunc(item.zIndex) };
    }
    const zIndex = next;
    next += 1;
    return { ...item, zIndex };
  };

  return {
    photos: bundle.photos.map(fill),
    texts: bundle.texts.map(fill),
    stickers: bundle.stickers.map(fill),
  };
}

export function maxDecorLayerZ(bundle: DecorLayerBundle): number {
  let max = 0;
  for (const item of [...bundle.photos, ...bundle.texts, ...bundle.stickers]) {
    if (typeof item.zIndex === 'number' && Number.isFinite(item.zIndex)) {
      max = Math.max(max, Math.trunc(item.zIndex));
    }
  }
  return max;
}

export function nextDecorLayerZ(bundle: DecorLayerBundle): number {
  return maxDecorLayerZ(ensureDecorLayerZIndexes(bundle)) + 1;
}

/** 저장 직전: 상대 순서 유지하며 z를 1…N으로 압축 */
export function normalizeDecorLayerBundle(bundle: DecorLayerBundle): DecorLayerBundle {
  const ensured = ensureDecorLayerZIndexes(bundle);
  const entries: ZItem[] = [
    ...ensured.photos.map((layer, tie) => ({
      kind: 'photo' as const,
      id: layer.id,
      zIndex: readZ(layer.zIndex, 0),
      tie,
    })),
    ...ensured.texts.map((layer, tie) => ({
      kind: 'text' as const,
      id: layer.id,
      zIndex: readZ(layer.zIndex, 0),
      tie: ensured.photos.length + tie,
    })),
    ...ensured.stickers.map((layer, tie) => ({
      kind: 'sticker' as const,
      id: layer.id,
      zIndex: readZ(layer.zIndex, 0),
      tie: ensured.photos.length + ensured.texts.length + tie,
    })),
  ];

  entries.sort((a, b) => a.zIndex - b.zIndex || a.tie - b.tie);

  const rank = new Map<string, number>();
  entries.forEach((entry, index) => {
    rank.set(`${entry.kind}:${entry.id}`, index + 1);
  });

  return {
    photos: ensured.photos.map((layer) => ({
      ...layer,
      zIndex: rank.get(`photo:${layer.id}`) ?? layer.zIndex,
    })),
    texts: ensured.texts.map((layer) => ({
      ...layer,
      zIndex: rank.get(`text:${layer.id}`) ?? layer.zIndex,
    })),
    stickers: ensured.stickers.map((layer) => ({
      ...layer,
      zIndex: rank.get(`sticker:${layer.id}`) ?? layer.zIndex,
    })),
  };
}

export function withLayerBroughtToFront(
  bundle: DecorLayerBundle,
  kind: DecorLayerKind,
  id: string,
): DecorLayerBundle {
  const ensured = ensureDecorLayerZIndexes(bundle);
  const top = maxDecorLayerZ(ensured) + 1;
  const bump = <T extends { id: string; zIndex?: number }>(item: T, match: boolean): T =>
    match ? { ...item, zIndex: top } : item;

  return {
    photos: ensured.photos.map((item) => bump(item, kind === 'photo' && item.id === id)),
    texts: ensured.texts.map((item) => bump(item, kind === 'text' && item.id === id)),
    stickers: ensured.stickers.map((item) =>
      bump(item, kind === 'sticker' && item.id === id),
    ),
  };
}

export function sortDecorLayersForRender(bundle: DecorLayerBundle): SortedDecorItem[] {
  const ensured = ensureDecorLayerZIndexes(bundle);
  const items: Array<SortedDecorItem & { z: number; tie: number }> = [
    ...ensured.photos.map((layer, tie) => ({
      kind: 'photo' as const,
      layer,
      z: readZ(layer.zIndex, 0),
      tie,
    })),
    ...ensured.texts.map((layer, tie) => ({
      kind: 'text' as const,
      layer,
      z: readZ(layer.zIndex, 0),
      tie: ensured.photos.length + tie,
    })),
    ...ensured.stickers.map((layer, tie) => ({
      kind: 'sticker' as const,
      layer,
      z: readZ(layer.zIndex, 0),
      tie: ensured.photos.length + ensured.texts.length + tie,
    })),
  ];
  items.sort((a, b) => a.z - b.z || a.tie - b.tie);
  return items.map(({ kind, layer }) => ({ kind, layer }) as SortedDecorItem);
}
