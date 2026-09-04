import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radii, spacing } from '../../theme';

type HomeBookShellProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** 표지 꾸미기에서 고른 책껍데기 색 */
  coverColor?: string;
  /** 책등 너비 (기본 22) */
  spineWidth?: number;
  /** 책등 왼쪽 이동 (음수면 왼쪽으로) */
  spineOffsetX?: number;
  /** 책등 안쪽 세로 줄 숨김 */
  hideSpineRidges?: boolean;
  /** 꾸미기용: 맨 앞 페이지 엣지 숨김 (캔버스가 그 자리를 대체) */
  hideFrontPageEdge?: boolean;
  /** 꾸미기용: 오른쪽 겹친 페이지 엣지 전체 숨김 */
  hidePageEdge?: boolean;
};

/** 홈 검정 블록용 책 형태(책등·페이지 엣지) — 아날로그 책 실루엣, 소프트한 깊이감 */
export function HomeBookShell({
  children,
  style,
  contentStyle,
  coverColor,
  spineWidth,
  spineOffsetX,
  hideSpineRidges = false,
  hideFrontPageEdge = false,
  hidePageEdge = false,
}: HomeBookShellProps) {
  const shellColor = coverColor?.trim() || undefined;

  return (
    <View style={[styles.book, shellColor ? { backgroundColor: shellColor } : null, style]}>
      {/* 바깥 하이라이트 림 — 평평한 검정 덩어리 느낌을 줄임 */}
      <View pointerEvents="none" style={styles.rim} />

      <View
        style={[
          styles.spine,
          typeof spineWidth === 'number' ? { width: spineWidth } : null,
          typeof spineOffsetX === 'number' ? { marginLeft: spineOffsetX } : null,
          shellColor
            ? { backgroundColor: shellColor, borderRightColor: 'rgba(0,0,0,0.22)' }
            : null,
        ]}
      >
        <View pointerEvents="none" style={styles.spineHighlight} />
        <View pointerEvents="none" style={styles.spineShade} />
        {hideSpineRidges ? null : (
          <View style={styles.spineRidges}>
            <View style={styles.spineRidge} />
            <View style={styles.spineRidge} />
            <View style={styles.spineRidge} />
            <View style={styles.spineRidge} />
          </View>
        )}
      </View>

      <View style={styles.coverWrap}>
        {/* 책등→표지 경계의 얕은 음영 */}
        <View pointerEvents="none" style={styles.gutterShadow} />
        <View style={[styles.cover, contentStyle]}>{children}</View>
      </View>

      {hidePageEdge ? null : (
        <View pointerEvents="none" style={styles.pageEdge}>
          <View style={[styles.pageSheet, styles.pageSheetBack]} />
          <View style={[styles.pageSheet, styles.pageSheetMid]} />
          {hideFrontPageEdge ? null : (
            <View style={[styles.pageSheet, styles.pageSheetFront]} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  book: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#141414',
    borderRadius: radii.xl,
    marginHorizontal: spacing.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: colors.black,
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  rim: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  spine: {
    width: 22,
    backgroundColor: '#0A0A0A',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  spineHighlight: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  spineShade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  spineRidges: {
    height: '62%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: 10,
  },
  spineRidge: {
    width: 2,
    flex: 1,
    maxHeight: 44,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  coverWrap: {
    flex: 1,
    position: 'relative',
  },
  gutterShadow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 10,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  cover: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    paddingRight: spacing.xxxl,
  },
  pageEdge: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    right: 4,
    width: 12,
  },
  pageSheet: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderTopRightRadius: 80,
    borderBottomRightRadius: 80,
  },
  pageSheetBack: {
    right: 0,
    width: 12,
    backgroundColor: '#E8E8E8',
    opacity: 0.7,
  },
  pageSheetMid: {
    right: 2,
    width: 10,
    backgroundColor: '#F2F2F2',
    opacity: 0.9,
  },
  pageSheetFront: {
    right: 4,
    width: 8,
    backgroundColor: '#FAFAFA',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(0,0,0,0.06)',
  },
});
