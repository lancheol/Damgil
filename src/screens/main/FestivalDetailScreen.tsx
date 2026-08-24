import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getFestivalDetail } from '../../api/festivals';
import { ApiError, FestivalDetailResponseDto, PlaceRelatedDto } from '../../api/types';
import { BackButton } from '../../components/common/BackButton';
import { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';
import {
  extractHref,
  formatFestivalPeriod,
  stripTourHtml,
} from '../../utils/festivalDetail';

type Props = NativeStackScreenProps<RootStackParamList, 'FestivalDetail'>;

const H_PADDING = 20;
/** 로드 전 임시 비율. onLoad 후 원본 비율로 맞춤 */
const DEFAULT_HERO_ASPECT = 0.75;
const MIN_HERO_ASPECT = 0.5;
const MAX_HERO_ASPECT = 1.55;

type InfoRow = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

export function FestivalDetailScreen({ navigation, route }: Props) {
  const { contentId, titleHint } = route.params;
  const [detail, setDetail] = useState<FestivalDetailResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [heroAspect, setHeroAspect] = useState(DEFAULT_HERO_ASPECT);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const payload = await getFestivalDetail(contentId);
      setDetail(payload);
    } catch (error) {
      setDetail(null);
      setErrorMessage(
        error instanceof ApiError ? error.message : '축제 정보를 불러오지 못했어요.',
      );
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setHeroAspect(DEFAULT_HERO_ASPECT);
  }, [contentId]);

  const stageWidth = Dimensions.get('window').width - spacing.lg * 2;
  const heroHeight = Math.round(
    stageWidth * Math.min(Math.max(heroAspect, MIN_HERO_ASPECT), MAX_HERO_ASPECT),
  );

  const common = detail?.common;
  const intro = detail?.intro;

  const title =
    stripTourHtml(common?.title) || titleHint?.trim() || '축제 상세';
  const period = formatFestivalPeriod(intro?.eventstartdate, intro?.eventenddate);
  const address = [common?.addr1, common?.addr2]
    .map((part) => stripTourHtml(part))
    .filter(Boolean)
    .join(' ');
  const overview = stripTourHtml(common?.overview);
  const homepage =
    extractHref(common?.homepage) ?? extractHref(intro?.eventhomepage);
  const tel = stripTourHtml(common?.tel) || stripTourHtml(intro?.sponsor1tel);

  const heroUri =
    common?.firstimage?.trim() ||
    common?.firstimage2?.trim() ||
    detail?.images?.find((uri) => uri.trim()) ||
    null;

  const infoRows = useMemo<InfoRow[]>(() => {
    const rows: Array<InfoRow | null> = [
      period
        ? { key: 'period', icon: 'calendar-outline', label: '기간', value: period }
        : null,
      address
        ? { key: 'address', icon: 'location-outline', label: '주소', value: address }
        : null,
      stripTourHtml(intro?.eventplace)
        ? {
            key: 'place',
            icon: 'flag-outline',
            label: '장소',
            value: stripTourHtml(intro?.eventplace),
          }
        : null,
      stripTourHtml(intro?.playtime)
        ? {
            key: 'playtime',
            icon: 'time-outline',
            label: '시간',
            value: stripTourHtml(intro?.playtime),
          }
        : null,
      stripTourHtml(intro?.usetimefestival)
        ? {
            key: 'fee',
            icon: 'ticket-outline',
            label: '요금',
            value: stripTourHtml(intro?.usetimefestival),
          }
        : null,
      stripTourHtml(intro?.agelimit)
        ? {
            key: 'age',
            icon: 'people-outline',
            label: '연령',
            value: stripTourHtml(intro?.agelimit),
          }
        : null,
      stripTourHtml(intro?.sponsor1)
        ? {
            key: 'sponsor',
            icon: 'business-outline',
            label: '주최',
            value: stripTourHtml(intro?.sponsor1),
          }
        : null,
      stripTourHtml(intro?.bookingplace)
        ? {
            key: 'booking',
            icon: 'cart-outline',
            label: '예매',
            value: stripTourHtml(intro?.bookingplace),
          }
        : null,
    ];
    return rows.filter((row): row is InfoRow => row != null);
  }, [address, intro, period]);

  const program = stripTourHtml(intro?.program);
  const subevent = stripTourHtml(intro?.subevent);
  const placeInfo = stripTourHtml(intro?.placeinfo);
  const related = detail?.related ?? [];

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      // ignore
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} color="#1E2939" />
        <Text style={styles.headerTitle} numberOfLines={1}>
          축제 상세
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : errorMessage ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void load()}
            style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
          >
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={[styles.heroStage, { height: heroHeight }]}>
            {heroUri ? (
              <Image
                source={{ uri: heroUri }}
                style={styles.heroImage}
                resizeMode="contain"
                onLoad={(event) => {
                  const source = event.nativeEvent.source as
                    | { width?: number; height?: number }
                    | undefined;
                  const width = source?.width ?? 0;
                  const height = source?.height ?? 0;
                  if (width > 0 && height > 0) {
                    setHeroAspect(height / width);
                  }
                }}
              />
            ) : (
              <View style={styles.heroFallback}>
                <Ionicons name="image-outline" size={36} color="#9CA3AF" />
                <Text style={styles.heroFallbackText}>이미지가 없어요</Text>
              </View>
            )}
          </View>

          <View style={styles.paper}>
            <Text style={styles.kicker}>FESTIVAL</Text>
            <Text style={styles.title}>{title}</Text>
            {period ? <Text style={styles.period}>{period}</Text> : null}
            {address ? (
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={14} color="#6A7282" />
                <Text style={styles.address}>{address}</Text>
              </View>
            ) : null}

            {infoRows.length > 0 ? (
              <View style={styles.infoCard}>
                {infoRows.map((row, index) => (
                  <View
                    key={row.key}
                    style={[
                      styles.infoRow,
                      index === infoRows.length - 1 && styles.infoRowLast,
                    ]}
                  >
                    <View style={styles.infoLabelRow}>
                      <Ionicons name={row.icon} size={14} color="#6A7282" />
                      <Text style={styles.infoLabel}>{row.label}</Text>
                    </View>
                    <Text style={styles.infoValue}>{row.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {overview ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>소개</Text>
                <Text style={styles.bodyText}>{overview}</Text>
              </View>
            ) : null}

            {program ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>프로그램</Text>
                <Text style={styles.bodyText}>{program}</Text>
              </View>
            ) : null}

            {subevent ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>부대 행사</Text>
                <Text style={styles.bodyText}>{subevent}</Text>
              </View>
            ) : null}

            {placeInfo ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>행사장 안내</Text>
                <Text style={styles.bodyText}>{placeInfo}</Text>
              </View>
            ) : null}

            {(homepage || tel) && (
              <View style={styles.actionRow}>
                {homepage ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="홈페이지 열기"
                    onPress={() => void openUrl(homepage)}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="globe-outline" size={16} color={colors.white} />
                    <Text style={styles.primaryButtonText}>홈페이지</Text>
                  </Pressable>
                ) : null}
                {tel ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="전화 걸기"
                    onPress={() => void openUrl(`tel:${tel.replace(/\s+/g, '')}`)}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="call-outline" size={16} color={colors.ink} />
                    <Text style={styles.secondaryButtonText}>전화</Text>
                  </Pressable>
                ) : null}
              </View>
            )}

            {related.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>근처 축제</Text>
                {related.map((item) => (
                  <RelatedFestivalRow
                    key={item.contentId}
                    item={item}
                    onPress={() =>
                      navigation.push('FestivalDetail', {
                        contentId: item.contentId,
                        titleHint: item.title,
                      })
                    }
                  />
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function RelatedFestivalRow({
  item,
  onPress,
}: {
  item: PlaceRelatedDto;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.relatedRow, pressed && styles.pressed]}
    >
      <View style={styles.relatedThumb}>
        {item.img?.trim() ? (
          <Image source={{ uri: item.img }} style={styles.relatedThumbImage} />
        ) : (
          <Ionicons name="image-outline" size={20} color="#9CA3AF" />
        )}
      </View>
      <View style={styles.relatedCopy}>
        <Text style={styles.relatedTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.relatedMeta} numberOfLines={1}>
          {[item.addr1, item.dist ? `${item.dist}m` : ''].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#99A1AF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PADDING - 8,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: H_PADDING,
  },
  errorText: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.black,
  },
  retryText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  heroStage: {
    marginHorizontal: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.black,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1A1A1A',
  },
  heroFallbackText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  paper: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  kicker: {
    fontFamily: 'Courier',
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.inkMuted,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 8,
  },
  period: {
    fontSize: 14,
    color: colors.inkSoft,
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 18,
  },
  address: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#6A7282',
  },
  infoCard: {
    borderRadius: radii.md,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginBottom: spacing.lg,
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    gap: 6,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6A7282',
  },
  infoValue: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  section: {
    marginBottom: spacing.lg,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  bodyText: {
    fontFamily: 'Courier',
    fontSize: 13,
    lineHeight: 21,
    color: colors.inkSoft,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.lg,
  },
  primaryButton: {
    flex: 1,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.black,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    minWidth: 96,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  relatedThumb: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  relatedThumbImage: {
    width: '100%',
    height: '100%',
  },
  relatedCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  relatedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  relatedMeta: {
    fontSize: 12,
    color: '#6A7282',
  },
  pressed: {
    opacity: 0.85,
  },
});
