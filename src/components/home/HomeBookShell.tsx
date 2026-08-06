import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radii, spacing } from '../../theme';

type HomeBookShellProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** 표지 꾸미기에서 고른 책껍데기 색 */
  coverColor?: string;
  /** 책등 너비 (기본 28) */
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

/** 홈 검정 블록용 책 형태(책등·페이지 엣지) */
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
      <View
        style={[
          styles.spine,
          typeof spineWidth === 'number' ? { width: spineWidth } : null,
          typeof spineOffsetX === 'number' ? { marginLeft: spineOffsetX } : null,
          shellColor
            ? { backgroundColor: shellColor, borderRightColor: 'rgba(0,0,0,0.18)' }
            : null,
        ]}
      >
        {hideSpineRidges ? null : (
          <>
            <View style={styles.spineRidge} />
            <View style={styles.spineRidge} />
            <View style={styles.spineRidge} />
          </>
        )}
      </View>

      <View style={[styles.cover, contentStyle]}>{children}</View>

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
    backgroundColor: colors.black,
    borderRadius: radii.xl,
    marginHorizontal: spacing.xl,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  spine: {
    width: 28,
    backgroundColor: '#0A0A0A',
    borderRightWidth: 1,
    borderRightColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: spacing.xl,
  },
  spineRidge: {
    width: 3,
    flex: 1,
    maxHeight: 48,
    borderRadius: radii.pill,
    backgroundColor: '#2E2E2E',
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
    top: 9,
    bottom: 9,
    right: 3,
    width: 14,
  },
  pageSheet: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderTopRightRadius: 100,
    borderBottomRightRadius: 100,
  },
  pageSheetBack: {
    right: 0,
    width: 14,
    backgroundColor: '#E8E2D4',
    opacity: 0.55,
  },
  pageSheetMid: {
    right: 2,
    width: 12,
    backgroundColor: '#F0EBE0',
    opacity: 0.8,
  },
  pageSheetFront: {
    right: 4,
    width: 10,
    backgroundColor: '#F7F3EA',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.35)',
  },
});
