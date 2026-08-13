import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../../theme';

type TermsLine =
  | { kind: 'article'; text: string }
  | { kind: 'subtitle'; text: string }
  | { kind: 'list'; text: string }
  | { kind: 'body'; text: string }
  | { kind: 'gap' };

function parseTermsBody(body: string): TermsLine[] {
  return body.split('\n').map((raw) => {
    const line = raw.trim();
    if (!line) {
      return { kind: 'gap' };
    }
    if (/^제\d+조/.test(line)) {
      return { kind: 'article', text: line };
    }
    if (/^\[.+\]$/.test(line)) {
      return { kind: 'subtitle', text: line.slice(1, -1) };
    }
    if (/^[-•]/.test(line) || /^\d+\.\s/.test(line) || /^[①-⑳]/.test(line)) {
      return { kind: 'list', text: line };
    }
    return { kind: 'body', text: line };
  });
}

type TermsBodyProps = {
  body: string;
};

export function TermsBody({ body }: TermsBodyProps) {
  const lines = parseTermsBody(body);

  return (
    <View>
      {lines.map((line, index) => {
        if (line.kind === 'gap') {
          return <View key={`gap-${index}`} style={styles.gap} />;
        }
        if (line.kind === 'article') {
          return (
            <Text key={`article-${index}`} style={styles.article}>
              {line.text}
            </Text>
          );
        }
        if (line.kind === 'subtitle') {
          return (
            <Text key={`subtitle-${index}`} style={styles.subtitle}>
              {line.text}
            </Text>
          );
        }
        if (line.kind === 'list') {
          return (
            <Text key={`list-${index}`} style={styles.list}>
              {line.text}
            </Text>
          );
        }
        return (
          <Text key={`body-${index}`} style={styles.body}>
            {line.text}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: {
    height: 10,
  },
  article: {
    ...typography.label,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 8,
  },
  subtitle: {
    ...typography.label,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.ink,
    marginTop: 6,
  },
  body: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkSoft,
  },
  list: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkSoft,
    paddingLeft: 8,
  },
});
