import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';

type DiarySocialDockProps = {
  liked: boolean;
  likeCount: number;
  commentCount: number;
  likeBusy?: boolean;
  placeName?: string | null;
  placeSaved: boolean;
  placeSaveEnabled: boolean;
  placeSaveBusy?: boolean;
  onToggleLike: () => void;
  onOpenComments: () => void;
  onTogglePlaceSave: () => void;
  bottomInset: number;
};

function formatCount(value: number): string {
  if (value <= 0) return '0';
  if (value > 999) return '999+';
  return String(value);
}

export function DiarySocialDock({
  liked,
  likeCount,
  commentCount,
  likeBusy = false,
  placeName,
  placeSaved,
  placeSaveEnabled,
  placeSaveBusy = false,
  onToggleLike,
  onOpenComments,
  onTogglePlaceSave,
  bottomInset,
}: DiarySocialDockProps) {
  return (
    <View style={[styles.dock, { paddingBottom: Math.max(bottomInset, 12) }]}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={liked ? '좋아요 취소' : '좋아요'}
          accessibilityState={{ selected: liked, disabled: likeBusy }}
          disabled={likeBusy}
          onPress={onToggleLike}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={22}
            color={liked ? colors.danger : colors.ink}
          />
          <Text style={[styles.count, liked && styles.countActive]}>{formatCount(likeCount)}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="댓글"
          onPress={onOpenComments}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Ionicons name="chatbubble-outline" size={21} color={colors.ink} />
          <Text style={styles.count}>{formatCount(commentCount)}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            !placeSaveEnabled
              ? '찜할 장소 없음'
              : placeSaved
                ? `${placeName ?? '장소'} 찜 해제`
                : `${placeName ?? '장소'} 찜하기`
          }
          accessibilityState={{ selected: placeSaved, disabled: !placeSaveEnabled || placeSaveBusy }}
          disabled={!placeSaveEnabled || placeSaveBusy}
          onPress={onTogglePlaceSave}
          style={({ pressed }) => [
            styles.action,
            styles.placeAction,
            pressed && placeSaveEnabled && styles.pressed,
            !placeSaveEnabled && styles.actionDisabled,
          ]}
        >
          <Ionicons
            name={placeSaved ? 'bookmark' : 'bookmark-outline'}
            size={21}
            color={!placeSaveEnabled ? colors.inkMuted : colors.ink}
          />
          <Text
            style={[styles.placeLabel, !placeSaveEnabled && styles.placeLabelDisabled]}
            numberOfLines={1}
          >
            {placeSaveEnabled ? placeName?.trim() || '장소 찜' : '장소 없음'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  action: {
    minHeight: 44,
    minWidth: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  placeAction: {
    flex: 1,
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  actionDisabled: {
    opacity: 0.45,
  },
  count: {
    ...typography.label,
    fontSize: 13,
    color: colors.inkSoft,
    minWidth: 14,
  },
  countActive: {
    color: colors.danger,
  },
  placeLabel: {
    ...typography.label,
    fontSize: 13,
    color: colors.inkSoft,
    flexShrink: 1,
    maxWidth: 120,
  },
  placeLabelDisabled: {
    color: colors.inkMuted,
  },
  pressed: {
    opacity: 0.7,
  },
});
