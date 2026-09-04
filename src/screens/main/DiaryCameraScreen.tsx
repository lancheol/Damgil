import { CameraType, CameraOrientation, CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BackButton } from '../../components/common/BackButton';
import { RootStackParamList } from '../../navigation/types';
import { DiaryMediaType } from '../../types/diary';
import { normalizePhotoDimensions } from '../../utils/mediaDimensions';
import { readDeviceLandscape, subscribeDeviceLandscape } from '../../utils/deviceOrientation';
import { colors, radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DiaryCamera'>;
type CaptureMode = 'picture' | 'video';

export function DiaryCameraScreen({ navigation, route }: Props) {
  const { diaryId } = route.params;
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [mode, setMode] = useState<CaptureMode>('picture');
  const [taking, setTaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const cameraOrientationRef = useRef<CameraOrientation | null>(null);
  const deviceLandscapeRef = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    return subscribeDeviceLandscape((landscape) => {
      if (landscape != null) {
        deviceLandscapeRef.current = landscape;
      }
    });
  }, []);

  const goToEntry = (
    uri: string,
    mediaType: DiaryMediaType,
    mediaWidth?: number,
    mediaHeight?: number,
    captureLandscape?: boolean,
  ) => {
    navigation.navigate('DiaryPhotoEntry', {
      diaryId,
      photoUri: uri,
      mediaType,
      mediaWidth,
      mediaHeight,
      captureLandscape,
    });
  };

  const ensureMicrophone = async () => {
    if (micPermission?.granted) {
      return true;
    }

    const result = await requestMicPermission();
    if (!result.granted) {
      Alert.alert('마이크 권한 필요', '동영상 촬영을 위해 마이크 접근을 허용해 주세요.');
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current || taking || recording) {
      return;
    }

    try {
      setTaking(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
        exif: true,
      });

      if (!photo?.uri) {
        return;
      }

      const deviceLandscape =
        deviceLandscapeRef.current ??
        (await readDeviceLandscape(cameraOrientationRef.current));

      const dims = normalizePhotoDimensions(
        photo.width,
        photo.height,
        photo.exif as Record<string, unknown> | undefined,
        deviceLandscape,
      );

      goToEntry(photo.uri, 'photo', dims.width, dims.height, dims.width > dims.height);
    } catch {
      Alert.alert('촬영 실패', '사진을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setTaking(false);
    }
  };

  const handleToggleRecording = async () => {
    if (!cameraRef.current || taking) {
      return;
    }

    if (recording) {
      cameraRef.current.stopRecording();
      return;
    }

    const micOk = await ensureMicrophone();
    if (!micOk) {
      return;
    }

    try {
      setRecording(true);
      const video = await cameraRef.current.recordAsync({
        maxDuration: 60,
      });

      if (video?.uri) {
        goToEntry(video.uri, 'video');
      }
    } catch {
      Alert.alert('촬영 실패', '동영상을 저장하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setRecording(false);
    }
  };

  const handleShutter = () => {
    if (mode === 'picture') {
      void handleTakePhoto();
      return;
    }
    void handleToggleRecording();
  };

  const switchMode = (next: CaptureMode) => {
    if (recording || taking || next === mode) {
      return;
    }
    setMode(next);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <BackButton onPress={() => navigation.goBack()} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.permissionTitle}>카메라 권한이 필요해요</Text>
          <Text style={styles.permissionBody}>
            여행 사진과 영상을 기록하려면 카메라 접근을 허용해 주세요.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void requestPermission();
            }}
            style={({ pressed }) => [styles.permissionButton, pressed && styles.pressed]}
          >
            <Text style={styles.permissionButtonText}>권한 허용</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.cameraRoot}>
      <CameraView
        key={`${mode}-${facing}`}
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode={mode}
        mute={false}
        videoQuality="720p"
        responsiveOrientationWhenOrientationLocked
        onResponsiveOrientationChanged={(event) => {
          cameraOrientationRef.current = event.orientation;
        }}
      />

      <View style={styles.controlsLayer} pointerEvents="box-none">
        <SafeAreaView style={styles.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
          <View style={styles.topBar} pointerEvents="box-none">
            <BackButton
              color={colors.white}
              onPress={() => {
                if (recording) {
                  cameraRef.current?.stopRecording();
                }
                navigation.goBack();
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="전면 후면 전환"
              disabled={recording || taking}
              onPress={() => {
                setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
              }}
              style={({ pressed }) => [
                styles.flipButton,
                (pressed || recording || taking) && styles.pressed,
              ]}
            >
              <Text style={styles.flipButtonText}>전환</Text>
            </Pressable>
          </View>

          <View style={styles.bottomControls}>
            {recording ? (
              <Text style={styles.recordingLabel}>녹화 중 · 다시 누르면 종료</Text>
            ) : null}

            <View style={styles.modeRow}>
              <Pressable
                accessibilityRole="button"
                disabled={recording}
                onPress={() => switchMode('picture')}
                style={styles.modeButton}
              >
                <Text style={[styles.modeText, mode === 'picture' && styles.modeTextActive]}>
                  사진
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={recording}
                onPress={() => switchMode('video')}
                style={styles.modeButton}
              >
                <Text style={[styles.modeText, mode === 'video' && styles.modeTextActive]}>
                  영상
                </Text>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                mode === 'picture' ? '사진 촬영' : recording ? '녹화 종료' : '영상 촬영'
              }
              disabled={taking}
              hitSlop={12}
              onPress={handleShutter}
              style={({ pressed }) => [
                styles.shutterOuter,
                mode === 'video' && styles.shutterOuterVideo,
                (pressed || taking) && styles.pressed,
              ]}
            >
              <View
                pointerEvents="none"
                style={[
                  styles.shutterInner,
                  mode === 'video' && styles.shutterInnerVideo,
                  recording && styles.shutterInnerRecording,
                ]}
              />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  cameraRoot: {
    flex: 1,
    backgroundColor: colors.black,
  },
  controlsLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    elevation: 20,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  flipButton: {
    minWidth: 64,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  flipButtonText: {
    ...typography.label,
    color: colors.white,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  permissionTitle: {
    ...typography.brandTitle,
    color: colors.ink,
    textAlign: 'center',
  },
  permissionBody: {
    ...typography.body,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: spacing.md,
    backgroundColor: colors.black,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  permissionButtonText: {
    ...typography.button,
    color: colors.white,
  },
  bottomControls: {
    alignItems: 'center',
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  recordingLabel: {
    ...typography.monoBody,
    color: colors.danger,
    letterSpacing: 0.4,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginBottom: spacing.xs,
  },
  modeButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  modeText: {
    ...typography.label,
    color: 'rgba(255,255,255,0.45)',
  },
  modeTextActive: {
    color: colors.white,
  },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: radii.pill,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuterVideo: {
    borderColor: colors.danger,
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
  },
  shutterInnerVideo: {
    backgroundColor: colors.danger,
  },
  shutterInnerRecording: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  pressed: {
    opacity: 0.85,
  },
});
