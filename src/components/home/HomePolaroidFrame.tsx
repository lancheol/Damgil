import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../theme';

type HomePolaroidFrameProps = {
  photo: ReactNode;
  caption: ReactNode;
  overlay?: ReactNode;
};

/** 홈 화면 폴라로이드 껍데기 — 흰 테두리 + 회색 사진면 + 하단 캡션 */
export function HomePolaroidFrame({ photo, caption, overlay }: HomePolaroidFrameProps) {
  return (
    <View style={styles.stage}>
      <View style={styles.shadowWrap}>
        <View style={styles.polaroid}>
          {overlay}
          <View style={styles.photoInset}>{photo}</View>
          <View style={styles.captionArea}>{caption}</View>
        </View>
      </View>
    </View>
  );
}

export const homePolaroidStyles = StyleSheet.create({
  photoWell: {
    flex: 1,
    backgroundColor: '#D8DADF',
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.88,
  },
});

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingVertical: 8,
  },
  shadowWrap: {
    width: '100%',
    maxWidth: 340,
    aspectRatio: 0.72,
    borderRadius: 10,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  polaroid: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  photoInset: {
    flex: 1,
  },
  captionArea: {
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
