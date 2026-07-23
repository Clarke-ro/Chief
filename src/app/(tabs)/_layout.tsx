import { BlurView } from 'expo-blur';
import { Redirect, Tabs } from 'expo-router';
import { CalendarDays, ChartNoAxesCombined, Home, User } from 'lucide-react-native';
import { memo, useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View, type ColorValue } from 'react-native';

import { ChiefLogo } from '@/features/chief/components/ChiefLogo';
import { useResolvedColorScheme } from '@/hooks/useResolvedColorScheme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ensureSessionBoot, useSessionBootStore } from '@/stores';

type TabIconProps = { color: ColorValue; size: number };

const HomeIcon = memo(function HomeIcon({ color, size }: TabIconProps) {
  return <Home color={color as string} size={size} strokeWidth={2} />;
});
const TodayIcon = memo(function TodayIcon({ color, size }: TabIconProps) {
  return <CalendarDays color={color as string} size={size} strokeWidth={2} />;
});
const ChiefIcon = memo(function ChiefIcon({ color, size }: TabIconProps) {
  return <ChiefLogo size={size} tintColor={color} />;
});
const AnalyticsIcon = memo(function AnalyticsIcon({ color, size }: TabIconProps) {
  return <ChartNoAxesCombined color={color as string} size={size} strokeWidth={2} />;
});
const ProfileIcon = memo(function ProfileIcon({ color, size }: TabIconProps) {
  return <User color={color as string} size={size} strokeWidth={2} />;
});

export default function TabsLayout() {
  const scheme = useResolvedColorScheme();
  const colors = useThemeColors();
  const ready = useSessionBootStore((s) => s.ready);
  const hasSession = useSessionBootStore((s) => s.hasSession);

  useEffect(() => {
    void ensureSessionBoot();
  }, []);

  if (!ready) {
    return (
      <View style={[styles.boot, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!hasSession) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      // Keep inactive scenes mounted to avoid blank-tab races; freeze off (5-tab freeze bugs).
      detachInactiveScreens={false}
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        freezeOnBlur: false,
        // Defer Analytics / Profile until first visit; primary tabs stay eager below
        lazy: true,
        sceneStyle: { backgroundColor: colors.bg, flex: 1 },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: styles.label,
        // Do not set height or paddingBottom here — React Navigation sizes the bar as
        // (49 + safe-area) and applies bottom inset padding. Overriding height while the
        // navigator still pads for the home indicator clips/covers the label row.
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.bgElevated,
            borderTopColor: colors.border,
          },
        ],
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={64}
              tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterial'}
              style={[StyleSheet.absoluteFill, styles.tabBarBackground]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          lazy: false,
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Today',
          lazy: false,
          tabBarIcon: ({ color, size }) => <TodayIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chief"
        options={{
          title: 'Chief',
          lazy: false,
          tabBarIcon: ({ color, size }) => <ChiefIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => <AnalyticsIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <ProfileIcon color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '500',
  },
  tabBar: {
    position: Platform.OS === 'ios' ? 'absolute' : 'relative',
    borderTopWidth: StyleSheet.hairlineWidth,
    // Keep the bar above scene backgrounds / absolute fillers (iOS absolute bar + web stacking).
    zIndex: 100,
    elevation: 8,
    overflow: 'visible',
  },
  tabBarBackground: {
    zIndex: 0,
  },
});
