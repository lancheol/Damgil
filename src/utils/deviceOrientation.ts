import type { CameraOrientation } from 'expo-camera';
import { DeviceMotion, DeviceMotionOrientation } from 'expo-sensors';

export function isLandscapeCameraOrientation(
  orientation?: CameraOrientation | null,
): boolean {
  return orientation === 'landscapeLeft' || orientation === 'landscapeRight';
}

export function isLandscapeDeviceMotion(orientation: number): boolean | undefined {
  if (
    orientation === DeviceMotionOrientation.RightLandscape ||
    orientation === DeviceMotionOrientation.LeftLandscape
  ) {
    return true;
  }
  if (
    orientation === DeviceMotionOrientation.Portrait ||
    orientation === DeviceMotionOrientation.UpsideDown
  ) {
    return false;
  }
  return undefined;
}

/** 앱이 portrait 고정이어도 실제 기기 방향(가로/세로)을 읽습니다. */
export async function readDeviceLandscape(
  cameraOrientation?: CameraOrientation | null,
): Promise<boolean | undefined> {
  if (isLandscapeCameraOrientation(cameraOrientation)) {
    return true;
  }
  if (cameraOrientation === 'portrait' || cameraOrientation === 'portraitUpsideDown') {
    return false;
  }

  const available = await DeviceMotion.isAvailableAsync();
  if (!available) {
    return undefined;
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (value: boolean | undefined) => {
      if (settled) {
        return;
      }
      settled = true;
      subscription.remove();
      clearTimeout(timer);
      resolve(value);
    };

    const subscription = DeviceMotion.addListener((measurement) => {
      const landscape = isLandscapeDeviceMotion(measurement.orientation);
      if (landscape != null) {
        finish(landscape);
      }
    });

    DeviceMotion.setUpdateInterval(50);
    const timer = setTimeout(() => finish(undefined), 400);
  });
}

export function subscribeDeviceLandscape(
  onChange: (landscape: boolean | undefined) => void,
): () => void {
  let subscription: { remove: () => void } | null = null;
  let cancelled = false;

  void DeviceMotion.isAvailableAsync().then((available) => {
    if (!available || cancelled) {
      return;
    }

    subscription = DeviceMotion.addListener((measurement) => {
      onChange(isLandscapeDeviceMotion(measurement.orientation));
    });
    DeviceMotion.setUpdateInterval(200);
  });

  return () => {
    cancelled = true;
    subscription?.remove();
  };
}
