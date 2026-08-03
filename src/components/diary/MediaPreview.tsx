import { useVideoPlayer, VideoView } from 'expo-video';
import { ReactNode, useState } from 'react';
import {
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

type MediaPreviewProps = {
  uri: string;
  mediaType?: DiaryMediaType;
  style?: ViewStyle;
  autoPlay?: boolean;
  nativeControls?: boolean;
  /** true면 미리보기를 90도 눕혀 가로로 표시 */
  landscape?: boolean;
};

export function MediaPreview({
  uri,
  mediaType = 'photo',
  style,
  autoPlay = true,
  nativeControls = false,
  landscape = false,
}: MediaPreviewProps) {
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
