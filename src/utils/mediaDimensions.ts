export function normalizePhotoDimensions(
  width: number,
  height: number,
  exif?: Record<string, unknown> | null,
  deviceLandscape?: boolean,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width, height };
  }

  let w = width;
  let h = height;

  const orientation = Number(exif?.Orientation ?? exif?.orientation ?? 0);
  const exifRotated = [5, 6, 7, 8].includes(orientation);
  if (exifRotated) {
    [w, h] = [h, w];
  } else if (deviceLandscape != null) {
    // EXIF가 없을 때만 기기 방향으로 보정 (portrait 고정 앱에서 센서는 세로로 남음)
    const mediaLandscape = w > h;
    if (deviceLandscape !== mediaLandscape) {
      [w, h] = [h, w];
    }
  }

  return { width: w, height: h };
}

/** Image.onLoad / 센서 크기가 EXIF와 다를 때 촬영 방향 기준으로 맞춤 */
export function resolveDisplayDimensions(
  width: number,
  height: number,
  captureLandscape?: boolean,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width, height };
  }
  if (captureLandscape == null) {
    return { width, height };
  }

  const mediaLandscape = width > height;
  if (captureLandscape !== mediaLandscape) {
    return { width: height, height: width };
  }
  return { width, height };
}

export function fitNaturalSize(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: maxWidth, height: maxHeight };
  }

  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
  return {
    width: sourceWidth * scale,
    height: sourceHeight * scale,
  };
}
