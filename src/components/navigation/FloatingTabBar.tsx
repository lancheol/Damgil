import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MainTabParamList } from '../../navigation/types';
import { colors, radii, spacing, typography } from '../../theme';

type TabConfig = {
  routeName: keyof MainTabParamList;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
};

/** AI 탭은 일시 비활성 — 화면/스택 코드는 유지 */
const TABS: TabConfig[] = [
  {
    routeName: 'Home',
    label: 'Home',
    icon: 'home-outline',
    iconFocused: 'home',
  },
  {
    routeName: 'Search',
    label: 'Search',
    icon: 'search-outline',
    iconFocused: 'search',
  },
  {
    routeName: 'Map',
    label: 'Map',
    icon: 'map-outline',
    iconFocused: 'map',
  },
  {
    routeName: 'MyPage',
    label: 'My Page',
    icon: 'person-circle-outline',
    iconFocused: 'person-circle',
  },
];

export function FloatingTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const focusedRoute = state.routes[state.index];
  const focusedOptions = focusedRoute ? descriptors[focusedRoute.key]?.options : undefined;
  const tabBarStyle = focusedOptions?.tabBarStyle;
  const hidden =
    tabBarStyle != null &&
    typeof tabBarStyle === 'object' &&
    !Array.isArray(tabBarStyle) &&
    'display' in tabBarStyle &&
    tabBarStyle.display === 'none';

  if (hidden) {
    return null;
  }

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={styles.bar}>
        {TABS.map((tab) => {
          const routeIndex = state.routes.findIndex((route) => route.name === tab.routeName);
          const isFocused = routeIndex >= 0 && state.index === routeIndex;
          const color = isFocused ? colors.accent : colors.inkMuted;
          const route = state.routes[routeIndex];

          return (
            <Pressable
              key={tab.routeName}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={tab.label}
              onPress={() => {
                if (routeIndex < 0 || !route) {
                  return;
                }

                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(tab.routeName);
                }
              }}
              style={styles.item}
            >
              <Ionicons
                name={isFocused ? tab.iconFocused : tab.icon}
                size={20}
                color={color}
              />
              <Text style={[styles.label, { color }]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  bar: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    ...typography.tabLabel,
    fontSize: 10,
  },
});
