import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Chart colors for each tab
const chartColors: Record<string, string> = {
  'heart-rate': '#CEA023',
  temperature: '#E74C3C',
  'blood-pressure': '#8E44AD',
};

export function ScrollableTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: Colors[theme].background,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          // Use chart color if tab is focused and has a chart color, otherwise use theme tint or default
          const activeColor = chartColors[route.name] ?? Colors[theme].tint;
          const color = isFocused ? activeColor : Colors[theme].tabIconDefault;

          const labelValue = options.tabBarLabel ?? options.title ?? route.name;
          const label =
            typeof labelValue === 'function'
              ? labelValue({
                  focused: isFocused,
                  color,
                  position: 'below-icon' as const,
                  children: route.name,
                })
              : labelValue;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }

            if (process.env.EXPO_OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const icon = options.tabBarIcon
            ? options.tabBarIcon({ focused: isFocused, color, size: 28 })
            : null;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabItem}
            >
              {icon}
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color,
                    fontSize: 12,
                  },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 100,
  },
  tabLabel: {
    marginTop: 4,
    textAlign: 'center',
  },
});
