import { useVideoPlayer, VideoView } from 'expo-video';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  ImageStyle,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { DiaryMediaType } from '../../types/diary';
import { colors, typography } from '../../theme';
import { fitNaturalSize, resolveDisplayDimensions } from '../../utils/mediaDimensions';

type MediaPreviewProps = {
  uri: string;
  mediaType?: DiaryMediaType;
  style?: ViewStyle;
  autoPlay?: boolean;
  nativeControls?: boolean;
  /** true면 미리보기를 90도 눕혀 가로로 표시 */
  landscape?: boolean;
  /** 원본 비율 유지 — maxScreenHeightRatio와 함께 사용 */
  fit?: 'cover' | 'natural';
  /** 화면 높이 대비 미리보기 최대 높이 (0~1) */
  maxScreenHeightRatio?: number;
  /** 화면 너비 대비 미리보기 최대 너비 (0~1) */
  maxScreenWidthRatio?: number;
  /** 촬영 직후 알려진 표시용 크기(가로·세로 방향 보정 포함) */
  intrinsicWidth?: number;
  intrinsicHeight?: number;
  /** 촬영 시 기기가 가로였는지 — EXIF/onLoad와 맞춰 프레임 비율 보정 */
  captureLandscape?: boolean;
};

function useNaturalBounds(
  maxScreenHeightRatio?: number,
  maxScreenWidthRatio = 0.92,
): { maxWidth: number; maxHeight: number } {
  return useMemo(() => {
    const { width, height } = Dimensions.get('window');
    return {
      maxWidth: width * maxScreenWidthRatio,
      maxHeight: height * (maxScreenHeightRatio ?? 0.4),
    };
  }, [maxScreenHeightRatio, maxScreenWidthRatio]);
}

export function MediaPreview({
  uri,
  mediaType = 'photo',
  style,
  autoPlay = true,
  nativeControls = false,
  landscape = false,
  fit = 'cover',
  maxScreenHeightRatio,
  maxScreenWidthRatio,
  intrinsicWidth,
  intrinsicHeight,
  captureLandscape,
}: MediaPreviewProps) {
  const useNaturalFit = fit === 'natural' && maxScreenHeightRatio != null;

  if (useNaturalFit) {
    if (mediaType === 'video') {
      return (
        <NaturalVideoPreview
          uri={uri}
          style={style}
          autoPlay={autoPlay}
          nativeControls={nativeControls}
          maxScreenHeightRatio={maxScreenHeightRatio}
          maxScreenWidthRatio={maxScreenWidthRatio}
        />
      );
    }

    return (
      <NaturalPhotoPreview
        uri={uri}
        style={style}
        maxScreenHeightRatio={maxScreenHeightRatio}
        maxScreenWidthRatio={maxScreenWidthRatio}
        intrinsicWidth={intrinsicWidth}
        intrinsicHeight={intrinsicHeight}
        captureLandscape={captureLandscape}
      />
    );
  }

  if (mediaType === 'video') {
    return (
      <VideoPreview
        uri={uri}
        style={style}
        autoPlay={autoPlay}
        nativeControls={nativeControls}
        landscape={landscape}
      />
    );
  }

  if (landscape) {
    return (
      <LandscapeFrame style={style}>
        {(innerStyle) => (
          <Image source={{ uri }} style={innerStyle} resizeMode="cover" />
        )}
      </LandscapeFrame>
    );
  }

  return (
    <View style={[styles.frame, style]}>
      <Image source={{ uri }} style={styles.fill} resizeMode="cover" />
    </View>
  );
}

function NaturalPhotoPreview({
  uri,
  style,
  maxScreenHeightRatio,
  maxScreenWidthRatio,
  intrinsicWidth,
  intrinsicHeight,
  captureLandscape,
}: {
  uri: string;
  style?: ViewStyle;
  maxScreenHeightRatio: number;
  maxScreenWidthRatio?: number;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
  captureLandscape?: boolean;
}) {
  const { maxWidth, maxHeight } = useNaturalBounds(maxScreenHeightRatio, maxScreenWidthRatio);
  const hasIntrinsicSize = intrinsicWidth != null && intrinsicHeight != null && intrinsicWidth > 0 && intrinsicHeight > 0;
  const effectiveLandscape =
    captureLandscape ?? (hasIntrinsicSize ? intrinsicWidth! > intrinsicHeight! : undefined);

  const toDisplaySize = (width: number, height: number) => {
    const resolved = resolveDisplayDimensions(width, height, effectiveLandscape);
    return fitNaturalSize(resolved.width, resolved.height, maxWidth, maxHeight);
  };

  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(() => {
    if (hasIntrinsicSize) {
      return toDisplaySize(intrinsicWidth!, intrinsicHeight!);
    }
    return null;
  });

  const applyDisplaySize = (width: number, height: number) => {
    if (width <= 0 || height <= 0) {
      return;
    }
    setDisplaySize(toDisplaySize(width, height));
  };

  useEffect(() => {
    if (hasIntrinsicSize) {
      applyDisplaySize(intrinsicWidth!, intrinsicHeight!);
    }
  }, [intrinsicWidth, intrinsicHeight, maxWidth, maxHeight, hasIntrinsicSize, effectiveLandscape]);

  return (
    <View
      style={[
        styles.naturalFrame,
        style,
        displaySize
          ? { width: displaySize.width, height: displaySize.height }
          : { width: maxWidth, height: maxHeight, opacity: 0 },
      ]}
    >
      <Image
        source={{ uri }}
        style={styles.fill}
        resizeMode="contain"
        onLoad={
          hasIntrinsicSize
            ? undefined
            : (event) => {
                const { width, height } = event.nativeEvent.source;
                applyDisplaySize(width, height);
              }
        }
      />
    </View>
  );
}

function NaturalVideoPreview({
  uri,
  style,
  autoPlay,
  nativeControls,
  maxScreenHeightRatio,
  maxScreenWidthRatio,
}: {
  uri: string;
  style?: ViewStyle;
  autoPlay: boolean;
  nativeControls: boolean;
  maxScreenHeightRatio: number;
  maxScreenWidthRatio?: number;
}) {
  const { maxWidth, maxHeight } = useNaturalBounds(maxScreenHeightRatio, maxScreenWidthRatio);
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null);

  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.muted = true;
    if (autoPlay) {
      instance.play();
    }
  });

  useEffect(() => {
    const subscription = player.addListener('sourceLoad', (payload) => {
      const track = payload.availableVideoTracks[0];
      const videoWidth = track?.size?.width;
      const videoHeight = track?.size?.height;
      if (!videoWidth || !videoHeight) {
        return;
      }
      setDisplaySize(fitNaturalSize(videoWidth, videoHeight, maxWidth, maxHeight));
    });

    return () => {
      subscription.remove();
    };
  }, [player, maxWidth, maxHeight]);

  const frameSize = displaySize ?? { width: maxWidth, height: maxHeight };

  return (
    <View
      style={[
        styles.naturalFrame,
        style,
        { width: frameSize.width, height: frameSize.height },
        !displaySize && styles.naturalFrameLoading,
      ]}
    >
      <VideoView
        player={player}
        style={styles.fill}
        contentFit="contain"
        nativeControls={nativeControls}
        allowsFullscreen={false}
      />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>VIDEO</Text>
      </View>
    </View>
  );
}

function LandscapeFrame({
  style,
  children,
  badge,
}: {
  style?: ViewStyle;
  children: (innerStyle: StyleProp<ImageStyle>) => ReactNode;
  badge?: boolean;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };

  const ready = size.width > 0 && size.height > 0;

  return (
    <View style={[styles.frame, style]} onLayout={handleLayout}>
      {ready ? (
        <View
          style={{
            position: 'absolute',
            width: size.height,
            height: size.width,
            left: (size.width - size.height) / 2,
            top: (size.height - size.width) / 2,
            transform: [{ rotate: '-90deg' }],
            overflow: 'hidden',
          }}
        >
          {children(styles.fill)}
        </View>
      ) : null}
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>VIDEO</Text>
        </View>
      ) : null}
    </View>
  );
}

function VideoPreview({
  uri,
  style,
  autoPlay,
  nativeControls,
  landscape,
}: {
  uri: string;
  style?: ViewStyle;
  autoPlay: boolean;
  nativeControls: boolean;
  landscape: boolean;
}) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.muted = true;
    if (autoPlay) {
      instance.play();
    }
  });

  if (landscape) {
    return (
      <LandscapeFrame style={style} badge>
        {(innerStyle) => (
          <VideoView
            player={player}
            style={innerStyle}
            contentFit="cover"
            nativeControls={nativeControls}
            allowsFullscreen={false}
          />
        )}
      </LandscapeFrame>
    );
  }

  return (
    <View style={[styles.frame, style]}>
      <VideoView
        player={player}
        style={styles.fill}
        contentFit="cover"
        nativeControls={nativeControls}
        allowsFullscreen={false}
      />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>VIDEO</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: colors.black,
  },
  naturalFrame: {
    overflow: 'hidden',
    borderRadius: 10,
    alignSelf: 'center',
  },
  naturalFrameLoading: {
    opacity: 0,
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  badgeText: {
    ...typography.monoBody,
    fontSize: 11,
    color: colors.white,
    letterSpacing: 1,
  },
});
