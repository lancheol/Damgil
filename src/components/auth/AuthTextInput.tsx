import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

type AuthTextInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  hint?: string;
  hideLabel?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
} & Omit<TextInputProps, 'value' | 'onChangeText'>;

export function AuthTextInput({
  label,
  value,
  onChangeText,
  error,
  hint,
  hideLabel = false,
  containerStyle,
  ...inputProps
}: AuthTextInputProps) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      {hideLabel ? null : <Text style={styles.label}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.inkMuted}
        autoCapitalize="none"
        style={[styles.input, error ? styles.inputError : null]}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.ink,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    fontSize: 12,
    color: colors.danger,
  },
  hint: {
    fontSize: 12,
    color: colors.inkMuted,
  },
});
