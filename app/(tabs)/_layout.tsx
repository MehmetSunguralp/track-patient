import { Tabs } from 'expo-router';
import React from 'react';

import { ScrollableTabBar } from '@/components/custom/ScrollableTabBar';
import CustomStatusBar from '@/components/custom/StatusBar';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabLayout() {
  return (
    <>
      <CustomStatusBar variant="tabs" />
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
        tabBar={(props) => <ScrollableTabBar {...props} />}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Overall',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="gauge" color={color} />,
          }}
        />
        <Tabs.Screen
          name="heart-rate"
          options={{
            title: 'Heart Rate',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="heart.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="temperature"
          options={{
            title: 'Temperature',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="thermometer" color={color} />,
          }}
        />
        <Tabs.Screen
          name="blood-pressure"
          options={{
            title: 'Blood Pressure',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="waveform.path" color={color} />,
          }}
        />
        <Tabs.Screen
          name="location"
          options={{
            title: 'Location',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="location.fill" color={color} />,
          }}
        />
      </Tabs>
    </>
  );
}
