import { Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

interface AreaChartProps {
  readonly color: string;
  readonly data: { value: number; label: string }[];
  readonly title: string;
}

export default function AreaChart({ color, data, title }: AreaChartProps) {
  const rawMax = Math.max(...data.map((d) => d.value));
  const stepValue = Math.ceil(rawMax / 5);

  const yAxisMaxValue = stepValue * 6; // +1 step headroom

  return (
    <View>
      <Text
        style={{ color, fontSize: 18, fontWeight: '600', marginBottom: 8, textAlign: 'center' }}
      >
        {title}
      </Text>
      <LineChart
        data={data}
        areaChart
        endSpacing={9}
        isAnimated
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
          pointerStripHeight: 0,
          pointerStripWidth: 0,
          pointerStripColor: 'transparent',
          pointerColor: 'transparent',
          radius: 0,
        }}
      />
    </View>
  );
}
