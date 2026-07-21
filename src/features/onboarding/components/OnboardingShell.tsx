import { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/theme';

type OnboardingShellProps = {
  children: ReactNode;
  footer?: ReactNode;
  /** 0-based step index — used for back affordance only. */
  stepIndex?: number;
  /** Vertically center body content (welcome / auth). Off for scrollable steps. */
  centered?: boolean;
  /** Show back control when the stack can pop. Defaults on after step 0. */
  showBack?: boolean;
};

/** Mobile-first chrome shared by every onboarding step — theme-aware. */
export function OnboardingShell({
  children,
  footer,
  stepIndex,
  centered = true,
  showBack,
}: OnboardingShellProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const canBack = showBack ?? (stepIndex != null && stepIndex > 0);

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.bg,
          paddingTop: insets.top + spacing[12],
          paddingBottom: Math.max(insets.bottom, spacing[16]),
        },
      ]}
    >
      <View style={styles.topBar}>
        {canBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [
              styles.backBtn,
              {
                backgroundColor: colors.bgSubtle,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
      </View>

      <View style={[styles.body, centered && styles.bodyCentered]}>{children}</View>

      {footer ? (
        <View style={[styles.footer, { backgroundColor: colors.bg }]}>{footer}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing[24],
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    marginBottom: spacing[16],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 40,
    height: 40,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  bodyCentered: {
    justifyContent: 'center',
  },
  footer: {
    flexShrink: 0,
    gap: spacing[12],
    paddingTop: spacing[16],
    width: '100%',
  },
});
