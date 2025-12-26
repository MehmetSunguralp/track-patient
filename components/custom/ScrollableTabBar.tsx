import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Chart colors for each tab
const chartColors: Record<string, string> = {
  'heart-rate': '#CEA023',
  temperature: '#E74C3C',
  'blood-pressure': '#8E44AD',
  location: '#3498DB',
  'rr-interval': '#8E44AD',
  'max-bpm': '#E74C3C',
  speed: '#27AE60',
  distance: '#3498DB',
  'metabolic-power': '#F39C12',
  'activity-zone': '#9B59B6',
  'step-side': '#16A085',
  'step-balance': '#1ABC9C',
};

export function ScrollableTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';
  const scrollViewRef = useRef<ScrollView>(null);
  const tabPositions = useRef<{ [key: number]: number }>({});
  const scrollViewWidthRef = useRef<number>(0);

  // Scroll to active tab when it changes
  useEffect(() => {
    const activeIndex = state.index;
    const tabPosition = tabPositions.current[activeIndex];
    
    if (tabPosition !== undefined && scrollViewRef.current) {
      // Use requestAnimationFrame to ensure layout is complete
      requestAnimationFrame(() => {
        if (scrollViewRef.current) {
          const scrollViewWidth = scrollViewWidthRef.current || 400; // Fallback to 400 if not measured
          const tabWidth = 100; // Approximate tab width from styles (minWidth: 100)
          
          // Calculate position to center the tab in viewport
          const scrollPosition = Math.max(
            0,
            tabPosition - scrollViewWidth / 2 + tabWidth / 2
          );
          
          scrollViewRef.current.scrollTo({
            x: scrollPosition,
            animated: true,
          });
        }
      });
    }
  }, [state.index]);

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
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onLayout={(event) => {
          scrollViewWidthRef.current = event.nativeEvent.layout.width;
        }}
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
              onLayout={(event) => {
                const { x } = event.nativeEvent.layout;
                tabPositions.current[index] = x;
              }}
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
