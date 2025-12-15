import { IconSymbol } from '@/components/ui/icon-symbol';
import { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

type IconSymbolName =
  | 'heart.fill'
  | 'thermometer'
  | 'waveform.path'
  | 'location.north'
  | 'arrow.left.and.right'
  | 'gauge';

interface AreaChartProps {
  readonly color: string;
  readonly data: { value: number; label: string }[];
  readonly title: string;
  readonly shouldAnimate?: boolean;
  readonly iconName?: IconSymbolName;
}

interface ChartData {
  value: number;
  label: string;
}
export default function AreaChart({
  color,
  data,
  title,
  shouldAnimate = true,
  iconName,
}: AreaChartProps) {
  const [animationKey, setAnimationKey] = useState(0);
  const prevFocusedRef = useRef(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Set initial opacity to 1 on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Only trigger animation when tab becomes focused (transitions from false to true)
    if (shouldAnimate && !prevFocusedRef.current) {
      // Reset opacity to 0 and animation key to trigger re-animation
      opacity.setValue(0);
      setAnimationKey((prev) => prev + 1);

      // Fade in the chart smoothly
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
    prevFocusedRef.current = shouldAnimate;
  }, [shouldAnimate, opacity]);

  const rawMax = Math.max(...data.map((d) => d.value));
  const stepValue = Math.ceil(rawMax / 5);

  const yAxisMaxValue = stepValue * 6; // +1 step headroom

  return (
    <View style={{ marginLeft: 12 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
        }}
      >
        {iconName && (
          <IconSymbol name={iconName as any} size={24} color={color} style={{ marginRight: 8 }} />
        )}
        <Text style={{ color, fontSize: 24, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
      </View>
      <Animated.View style={{ opacity }}>
        <LineChart
          key={animationKey}
          data={data}
          areaChart
          endSpacing={9}
          isAnimated
          curved
          disableScroll
          /* Y AXIS */
          maxValue={yAxisMaxValue}
          stepValue={stepValue}
          noOfSections={5}
          /* LINE */
          thickness={2}
          color={color}
          /* GRADIENT */
          startFillColor={color}
          endFillColor={color}
          startOpacity={0.35}
          endOpacity={0.05}
          /* RULERS */
          rulesType="dotted"
          rulesColor={color}
          rulesThickness={1}
          dashWidth={1}
          dashGap={10}
          xAxisColor={color}
          yAxisColor={color}
          yAxisTextStyle={{ color, opacity: 0.6 }}
          xAxisLabelTextStyle={{ fontSize: 10, color, opacity: 0.6 }}
          /* POINTERS */
          hideDataPoints
          pointerConfig={{
            pointerStripColor: color,
            pointer1Color: color,
            pointerLabelComponent: (items: ChartData[]) => {
              return (
                <View
                  style={{
                    width: 64,
                    height: 20,
                    backgroundColor: color,
                    borderRadius: 100,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600' }}>
                    {items[0].value}
                  </Text>
                </View>
              );
            },
          }}
        />
      </Animated.View>
    </View>
  );
}
