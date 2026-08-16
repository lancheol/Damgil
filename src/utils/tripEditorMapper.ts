import type { DiaryEditorStateDto, EditorObjectDto, EditorStateDto } from '../api/types';
import type {
  DecorFontId,
  Diary,
  DiaryPlaceSelection,
  PlacePageDecoration,
} from '../types/diary';
import { buildDiaryTimeline } from './diaryTimeline';

const OBJECT_PREFIX = 'place:';
const DEFAULT_TEXT_COLOR = '#111111';

function objectId(placeId: string, type: 'photo' | 'sticker' | 'text', id: string): string {
  return `${OBJECT_PREFIX}${encodeURIComponent(placeId)}:${type}:${encodeURIComponent(id)}`.slice(
    0,
    100,
  );
}

function parseObjectId(
  value: string,
): { placeId: string; type: 'photo' | 'sticker' | 'text'; id: string } | null {
  const match = /^place:([^:]+):(photo|sticker|text):(.+)$/.exec(value);
  if (!match) return null;
  try {
    return {
      placeId: decodeURIComponent(match[1]),
      type: match[2] as 'photo' | 'sticker' | 'text',
      id: decodeURIComponent(match[3]),
    };
  } catch {
    return null;
  }
}

function toFontId(value: string | undefined): DecorFontId {
  return value === 'serif' ||
    value === 'mono' ||
    value === 'rounded' ||
    value === 'hand' ||
    value === 'display'
    ? value
    : 'sans';
}

function placesForDay(diary: Diary, dayNumber: number): DiaryPlaceSelection[] {
  const day = buildDiaryTimeline(diary).find((item) => item.dayNumber === dayNumber);
  if (!day) return [];
  const ids = new Set(day.records.map((photo) => photo.id));
  return (diary.placeSelections ?? []).filter(
    (place) =>
      ids.has(place.representativePhotoId) || place.photoIds.some((photoId) => ids.has(photoId)),
  );
}

export function dayNumberForPlace(diary: Diary, placeId: string): number | null {
  for (const day of buildDiaryTimeline(diary)) {
    if (placesForDay(diary, day.dayNumber).some((place) => place.id === placeId)) {
      return day.dayNumber;
    }
  }
  return null;
}

export function buildEditorStateForDay(diary: Diary, dayNumber: number): EditorStateDto {
  const objects: EditorObjectDto[] = [];

  for (const place of placesForDay(diary, dayNumber)) {
    const decoration = place.pageDecoration;
    if (!decoration) continue;

    decoration.photos.forEach((layer, index) => {
      const mediaId = diary.photos.find((photo) => photo.id === layer.photoId)?.mediaId;
      if (!mediaId) return;
      objects.push({
        objectId: objectId(place.id, 'photo', layer.id),
        objectType: 'IMAGE',
        x: layer.x,
        y: layer.y,
        width: 0.72 * layer.scale,
        height: 0.72 * layer.scale,
        rotation: layer.rotation,
        layer: index,
        mediaId,
      });
    });

    decoration.stickers.forEach((sticker, index) => {
      objects.push({
        objectId: objectId(place.id, 'sticker', sticker.id),
        objectType: 'STICKER',
        x: sticker.x,
        y: sticker.y,
        width: 0.18 * sticker.scale,
        height: 0.18 * sticker.scale,
        rotation: sticker.rotation,
        layer: decoration.photos.length + index,
        stickerId: sticker.emoji,
      });
    });

    decoration.texts.forEach((text, index) => {
      objects.push({
        objectId: objectId(place.id, 'text', text.id),
        objectType: 'TEXT',
        x: text.x,
        y: text.y,
        width: 0.4 * text.scale,
        height: 0.1 * text.scale,
        rotation: text.rotation,
        layer: decoration.photos.length + decoration.stickers.length + index,
        text: text.content.slice(0, 500),
        fontFamily: text.fontId,
        fontSize: 24 * text.scale,
        align: 'center',
      });
    });
  }

  return { objects: objects.slice(0, 200) };
}

export function applyEditorDaysToDiary(
  diary: Diary,
  days: DiaryEditorStateDto[],
): Diary {
  const nextSelections = (diary.placeSelections ?? []).map((place) => {
    const objects = days.flatMap((day) =>
      day.editorState.objects
        .map((object) => ({ object, parsed: parseObjectId(object.objectId), day }))
        .filter((entry) => entry.parsed?.placeId === place.id),
    );
    if (objects.length === 0) return place;

    const decoration: PlacePageDecoration = {
      photos: [],
      stickers: [],
      texts: [],
      updatedAt: objects.reduce(
        (latest, entry) => (entry.day.updatedAt > latest ? entry.day.updatedAt : latest),
        '',
      ),
    };

    for (const { object, parsed } of objects) {
      if (!parsed) continue;
      if (parsed.type === 'photo' && object.objectType === 'IMAGE' && object.mediaId) {
        const photo = diary.photos.find((item) => item.mediaId === object.mediaId);
        if (!photo) continue;
        decoration.photos.push({
          id: parsed.id,
          photoId: photo.id,
          x: object.x,
          y: object.y,
          scale: object.width / 0.72,
          rotation: object.rotation,
          cropRect: photo.decoration?.cropRect ?? null,
        });
      } else if (parsed.type === 'sticker' && object.objectType === 'STICKER') {
        decoration.stickers.push({
          id: parsed.id,
          emoji: object.stickerId ?? '⭐',
          x: object.x,
          y: object.y,
          scale: object.width / 0.18,
          rotation: object.rotation,
        });
      } else if (parsed.type === 'text' && object.objectType === 'TEXT') {
        decoration.texts.push({
          id: parsed.id,
          content: object.text ?? '',
          fontId: toFontId(object.fontFamily),
          color: DEFAULT_TEXT_COLOR,
          x: object.x,
          y: object.y,
          scale: object.fontSize ? object.fontSize / 24 : object.width / 0.4,
          rotation: object.rotation,
        });
      }
    }

    return { ...place, pageDecoration: decoration };
  });

  return { ...diary, placeSelections: nextSelections };
}
