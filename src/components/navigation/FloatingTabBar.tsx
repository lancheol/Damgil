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
    routeName: 'MyPage',
    label: 'My Page',
    icon: 'person-circle-outline',
    iconFocused: 'person-circle',
  },
];

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={styles.bar}>
        {TABS.map((tab, index) => {
          const isFocused = state.index === index;
          const color = isFocused ? colors.accent : colors.inkMuted;

          return (
            <Pressable
              key={tab.routeName}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={tab.label}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: state.routes[index]?.key,
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
                size={22}
                color={color}
              />
              <Text style={[styles.label, { color }]}>{tab.label}</Text>
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
    paddingHorizontal: spacing.xl,
  },
  bar: {
    width: '100%',
    maxWidth: 360,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
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
  },
});
