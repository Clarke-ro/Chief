import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

import { PlatformIcon, type PlatformIconId } from '@/components/ui';
import { OnboardingCopy } from '@/features/onboarding/components/OnboardingCopy';
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell';
import { useOnboardingStore } from '@/features/onboarding/store';
import { useResolvedColorScheme } from '@/hooks/useResolvedColorScheme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { onboardingRepository } from '@/services';
import { radius, spacing } from '@/theme';

const ONBOARDING_APPS = onboardingRepository.listApps();
const COLS = 3;
const GRID_GAP = spacing[12];

/** Step 3 — pick the apps Chief should read. */
export function ConnectAppsScreen() {
  const colors = useThemeColors();
  const scheme = useResolvedColorScheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const connected = useOnboardingStore((s) => s.connected);
  const toggleApp = useOnboardingStore((s) => s.toggleApp);
  const hasAny = connected.size > 0;

  const isLight = scheme === 'light';
  const ink = isLight ? '#111113' : colors.text;
  const inkOn = isLight ? '#FFFFFF' : colors.bg;

  // Shell horizontal padding is 24 each side
  const gridWidth = width - spacing[24] * 2;
  const tileSize = (gridWidth - GRID_GAP * (COLS - 1)) / COLS;

  return (
    <OnboardingShell
      stepIndex={2}
      centered={false}
      footer={
        <View style={styles.footer}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Continue"
            accessibilityState={{ disabled: !hasAny }}
            activeOpacity={0.85}
            disabled={!hasAny}
            onPress={() => router.push('/onboarding/scan')}
            style={[
              styles.primaryBtn,
              {
                backgroundColor: ink,
                opacity: hasAny ? 1 : 0.4,
              },
            ]}
          >
            <Text style={[styles.primaryLabel, { color: inkOn }]}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Skip for now"
            activeOpacity={0.55}
            onPress={() => router.push('/onboarding/scan')}
            style={styles.skipBtn}
          >
            <Text style={[styles.skipLabel, { color: ink }]}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <OnboardingCopy title="Connect your apps." />

        <View style={styles.grid}>
          {ONBOARDING_APPS.map((app) => {
            const isOn = connected.has(app.id);
            return (
              <TouchableOpacity
                key={app.id}
                accessibilityRole="switch"
                accessibilityState={{ checked: isOn }}
                accessibilityLabel={app.name}
                activeOpacity={0.85}
                onPress={() => toggleApp(app.id)}
                style={[
                  styles.tile,
                  {
                    width: tileSize,
                    backgroundColor: isOn ? colors.accentMuted : colors.bgElevated,
                    borderColor: isOn ? ink : colors.border,
                  },
                ]}
              >
                {isOn ? (
                  <View style={[styles.check, { backgroundColor: ink }]}>
                    <Check size={12} color={inkOn} strokeWidth={3} />
                  </View>
                ) : null}
                <PlatformIcon platform={app.platform as PlatformIconId} size={40} />
                <Text
                  style={[styles.tileName, { color: ink }]}
                  numberOfLines={1}
                >
                  {app.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    gap: spacing[24],
    paddingBottom: spacing[16],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    minHeight: 108,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[8],
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  check: {
    position: 'absolute',
    top: spacing[8],
    right: spacing[8],
    width: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileName: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    width: '100%',
    gap: spacing[12],
  },
  primaryBtn: {
    width: '100%',
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: spacing[8],
  },
  skipLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
});
