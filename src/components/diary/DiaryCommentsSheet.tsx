import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addTripComment, deleteComment, listTripComments, updateComment } from '../../api/social';
import { loadTokens } from '../../api/tokenStorage';
import { ApiError, CommentDto, ReportTargetType } from '../../api/types';
import { ReportReasonSheet } from '../moderation/ReportReasonSheet';
import { useAuth } from '../../context/AuthContext';
import { confirmBlockUser } from '../../utils/moderationActions';
import { colors, radii, spacing, typography } from '../../theme';

type DiaryCommentsSheetProps = {
  visible: boolean;
  tripId: string;
  onClose: () => void;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
};

function formatCommentTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DiaryCommentsSheet({
  visible,
  tripId,
  onClose,
  onCommentAdded,
  onCommentDeleted,
}: DiaryCommentsSheetProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [menuComment, setMenuComment] = useState<CommentDto | null>(null);
  const [editingComment, setEditingComment] = useState<CommentDto | null>(null);
  const [reportTarget, setReportTarget] = useState<{
    targetType: ReportTargetType;
    targetId: string;
  } | null>(null);

  const isEditing = editingComment != null;

  const resetComposer = () => {
    setDraft('');
    setEditingComment(null);
  };

  const loadComments = useCallback(
    async (nextPage = 1, append = false) => {
      const tokens = await loadTokens();
      if (!tokens?.access) {
        Alert.alert('댓글', '로그인이 필요합니다.');
        return;
      }
      setLoading(true);
      try {
        const result = await listTripComments(tokens.access, tripId, {
          page: nextPage,
          limit: 30,
        });
        const items = (result.items ?? []).filter((item) => !item.deletedAt);
        setComments((prev) => (append ? [...prev, ...items] : items));
        setHasMore(Boolean(result.hasMore));
        setPage(result.page ?? nextPage);
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : '댓글을 불러오지 못했어요.';
        Alert.alert('댓글', message);
      } finally {
        setLoading(false);
      }
    },
    [tripId],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }
    resetComposer();
    setMenuComment(null);
    void loadComments(1, false);
  }, [visible, loadComments]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;

    const tokens = await loadTokens();
    if (!tokens?.access) {
      Alert.alert('댓글', '로그인이 필요합니다.');
      return;
    }

    setSending(true);
    try {
      if (editingComment) {
        try {
          const updated = await updateComment(tokens.access, editingComment.id, {
            body: body.slice(0, 1000),
          });
          setComments((prev) =>
            prev.map((item) => (item.id === editingComment.id ? updated : item)),
          );
        } catch (error) {
          // API 미구현(404/501 등) — UI 미리보기용으로 로컬만 반영
          const code = error instanceof ApiError ? error.status : 0;
          if (code === 404 || code === 501 || code === 405) {
            setComments((prev) =>
              prev.map((item) =>
                item.id === editingComment.id
                  ? { ...item, body: body.slice(0, 1000) }
                  : item,
              ),
            );
            Alert.alert(
              '임시 반영',
              '댓글 수정 API가 아직 없어요. 화면에는 반영해 둘게요. 서버 저장은 API 나온 뒤 연결하면 됩니다.',
            );
          } else {
            throw error;
          }
        }
        resetComposer();
        return;
      }

      const created = await addTripComment(tokens.access, tripId, {
        body: body.slice(0, 1000),
      });
      setComments((prev) => [...prev, created]);
      setDraft('');
      onCommentAdded?.();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : isEditing
            ? '댓글을 수정하지 못했어요.'
            : '댓글을 등록하지 못했어요.';
      Alert.alert('댓글', message);
    } finally {
      setSending(false);
    }
  };

  const startEdit = (comment: CommentDto) => {
    setMenuComment(null);
    setEditingComment(comment);
    setDraft(comment.body);
  };

  const confirmDelete = (comment: CommentDto) => {
    setMenuComment(null);
    Alert.alert('댓글 삭제', '이 댓글을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const tokens = await loadTokens();
            if (!tokens?.access) return;
            try {
              await deleteComment(tokens.access, comment.id);
              setComments((prev) => prev.filter((item) => item.id !== comment.id));
              if (editingComment?.id === comment.id) {
                resetComposer();
              }
              onCommentDeleted?.();
            } catch (error) {
              const message =
                error instanceof ApiError ? error.message : '댓글을 삭제하지 못했어요.';
              Alert.alert('댓글', message);
            }
          })();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{isEditing ? '댓글 수정' : '댓글'}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="닫기"
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Ionicons name="close" size={22} color={colors.inkMuted} />
            </Pressable>
          </View>

          {loading && comments.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.ink} />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              contentContainerStyle={
                comments.length === 0 ? styles.emptyList : styles.listContent
              }
              ListEmptyComponent={
                <Text style={styles.emptyText}>아직 댓글이 없어요.</Text>
              }
              renderItem={({ item }) => {
                const isMine = user?.id != null && item.userId === user.id;
                const isActiveEdit = editingComment?.id === item.id;
                const canModerate = Boolean(item.userId);
                return (
                  <View style={[styles.commentRow, isActiveEdit && styles.commentRowEditing]}>
                    <View style={styles.commentBody}>
                      <Text style={styles.nickname}>
                        {item.authorNickname?.trim() || '여행자'}
                      </Text>
                      <Text style={styles.body}>{item.body}</Text>
                      <Text style={styles.time}>{formatCommentTime(item.createdAt)}</Text>
                    </View>
                    {canModerate || isMine ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="더보기"
                        onPress={() => setMenuComment(item)}
                        hitSlop={8}
                        style={({ pressed }) => pressed && styles.pressed}
                      >
                        <Ionicons name="ellipsis-vertical" size={16} color={colors.inkMuted} />
                      </Pressable>
                    ) : null}
                  </View>
                );
              }}
              onEndReached={() => {
                if (!loading && hasMore) {
                  void loadComments(page + 1, true);
                }
              }}
              onEndReachedThreshold={0.3}
            />
          )}

          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={isEditing ? '댓글을 수정하세요' : '댓글을 남겨보세요'}
              placeholderTextColor={colors.placeholder}
              style={styles.input}
              maxLength={1000}
              multiline
            />
            {isEditing ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="수정 취소"
                onPress={resetComposer}
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
              >
                <Text style={styles.cancelText}>취소</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isEditing ? '댓글 수정 저장' : '댓글 등록'}
              disabled={sending || !draft.trim()}
              onPress={() => {
                void handleSend();
              }}
              style={({ pressed }) => [
                styles.sendButton,
                (!draft.trim() || sending) && styles.sendButtonDisabled,
                pressed && draft.trim() && !sending && styles.pressed,
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.sendText}>{isEditing ? '저장' : '등록'}</Text>
              )}
            </Pressable>
          </View>
        </View>

        <Modal
          visible={Boolean(menuComment)}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuComment(null)}
        >
          <Pressable style={styles.menuBackdrop} onPress={() => setMenuComment(null)}>
            <Pressable style={styles.menuCard} onPress={() => undefined}>
              <Text style={styles.menuTitle}>댓글</Text>
              {menuComment &&
              user?.id != null &&
              menuComment.userId === user.id ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (menuComment) startEdit(menuComment);
                    }}
                    style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.ink} />
                    <Text style={styles.menuItemText}>수정</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (menuComment) confirmDelete(menuComment);
                    }}
                    style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    <Text style={[styles.menuItemText, styles.menuItemDanger]}>삭제</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (!menuComment) return;
                      const id = menuComment.id;
                      setMenuComment(null);
                      setReportTarget({ targetType: 'comment', targetId: id });
                    }}
                    style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
                  >
                    <Ionicons name="flag-outline" size={18} color={colors.ink} />
                    <Text style={styles.menuItemText}>댓글 신고</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (!menuComment?.userId) return;
                      const authorId = menuComment.userId;
                      setMenuComment(null);
                      confirmBlockUser(authorId, () => {
                        setComments((prev) =>
                          prev.filter((item) => item.userId !== authorId),
                        );
                      });
                    }}
                    style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
                  >
                    <Ionicons name="hand-left-outline" size={18} color={colors.danger} />
                    <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                      작성자 차단
                    </Text>
                  </Pressable>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        <ReportReasonSheet
          visible={reportTarget != null}
          targetType={reportTarget?.targetType ?? null}
          targetId={reportTarget?.targetId ?? null}
          onClose={() => setReportTarget(null)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  sheet: {
    maxHeight: '72%',
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4D4D4',
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.label,
    fontSize: 16,
    color: colors.ink,
  },
  loadingBox: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  emptyList: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  commentRowEditing: {
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
  },
  commentBody: {
    flex: 1,
    gap: 4,
  },
  nickname: {
    ...typography.label,
    fontSize: 13,
    color: colors.ink,
  },
  body: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkSoft,
  },
  time: {
    fontSize: 11,
    color: colors.inkMuted,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 96,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: colors.ink,
    fontSize: 14,
  },
  cancelButton: {
    height: 40,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    ...typography.label,
    fontSize: 13,
    color: colors.inkMuted,
  },
  sendButton: {
    minWidth: 56,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  sendButtonDisabled: {
    backgroundColor: '#D4D4D4',
  },
  sendText: {
    ...typography.label,
    color: colors.white,
    fontSize: 13,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  menuCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  menuTitle: {
    ...typography.label,
    color: colors.inkMuted,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  menuItemText: {
    ...typography.body,
    fontSize: 15,
    color: colors.ink,
  },
  menuItemDanger: {
    color: colors.danger,
  },
  pressed: {
    opacity: 0.75,
  },
});
