import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createReport } from '../../api/moderation';
import { loadTokens } from '../../api/tokenStorage';
import { ApiError, ReportReason, ReportTargetType } from '../../api/types';
import { REPORT_REASON_OPTIONS, toApiNumericId } from '../../utils/moderationActions';
import { colors, radii, spacing } from '../../theme';

type ReportReasonSheetProps = {
  visible: boolean;
  targetType: ReportTargetType | null;
  targetId: string | null;
  onClose: () => void;
  onSubmitted?: () => void;
};

export function ReportReasonSheet({
  visible,
  targetType,
  targetId,
  onClose,
  onSubmitted,
}: ReportReasonSheetProps) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);

  const resetAndClose = () => {
    setReason(null);
    setDetail('');
    onClose();
  };

  const submit = () => {
    if (!targetType || !targetId || !reason || busy) return;

    Alert.alert(
      '?†Í≥†?†Íπå??',
      '?ëÏàò???†Í≥†???¥ÏòÅ?Ä??Í≤Ä?†Ìï¥?? ?àÏúÑ ?†Í≥†???úÌïú?????àÏñ¥??',
      [
        { text: 'Ï∑®ÏÜå', style: 'cancel' },
        {
          text: '?†Í≥†',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const numericId = toApiNumericId(targetId);
              if (numericId == null) {
                Alert.alert('?†Í≥†', '?†Í≥† ?Ä?ÅÏùÑ ?ïÏù∏?????ÜÏñ¥??');
                return;
              }
              const tokens = await loadTokens();
              if (!tokens?.access) {
                Alert.alert('?†Í≥†', 'Î°úÍ∑∏?∏Ïù¥ ?ÑÏöî?©Îãà??');
                return;
              }
              setBusy(true);
              try {
                const trimmed = detail.trim();
                await createReport(tokens.access, {
                  targetType,
                  targetId: numericId,
                  reason,
                  ...(trimmed ? { detail: trimmed.slice(0, 1000) } : {}),
                });
                resetAndClose();
                Alert.alert('?†Í≥†', '?†Í≥†Í∞Ä ?ëÏàò?òÏóà?¥Ïöî.');
                onSubmitted?.();
              } catch (error) {
                const message =
                  error instanceof ApiError
                    ? error.message
                    : '?†Í≥†Î•?Î≥¥ÎÇ¥ÏßÄ Î™ªÌñà?¥Ïöî. ?†Ïãú ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??';
                Alert.alert('?†Í≥†', message);
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={resetAndClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={resetAndClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={styles.title}>?†Í≥† ?¨Ïú†</Text>
          {REPORT_REASON_OPTIONS.map((option) => {
            const active = reason === option.reason;
            return (
              <Pressable
                key={option.reason}
                onPress={() => setReason(option.reason)}
                style={[styles.reasonRow, active && styles.reasonRowActive]}
              >
                <Text style={[styles.reasonText, active && styles.reasonTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
          <TextInput
            value={detail}
            onChangeText={setDetail}
            placeholder="?êÏÑ∏???¥Ïö© (?†ÌÉù)"
            placeholderTextColor={colors.placeholder}
            style={styles.detail}
            multiline
            maxLength={1000}
          />
          <Pressable
            disabled={!reason || busy}
            onPress={submit}
            style={({ pressed }) => [
              styles.submit,
              (!reason || busy) && styles.submitDisabled,
              pressed && reason && !busy && styles.pressed,
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>?§Ïùå</Text>
            )}
          </Pressable>
        </View>
      </View>
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
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  reasonRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: '#F7F7F7',
  },
  reasonRowActive: {
    backgroundColor: '#1A1A1A',
  },
  reasonText: {
    fontSize: 14,
    color: colors.ink,
  },
  reasonTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  detail: {
    minHeight: 72,
    marginTop: 4,
    borderRadius: radii.md,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  submit: {
    marginTop: 8,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.85,
  },
});
