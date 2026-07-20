import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton, PriorityIndicator } from '@/components/ui';
import { OnboardingCopy } from '@/features/onboarding/components/OnboardingCopy';
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell';
import { useThemeColors } from '@/hooks/useThemeColors';
import { onboardingRepository } from '@/services';
import { radius, spacing, typography } from '@/theme';

const FIRST_BRIEF_ITEMS = onboardingRepository.listFirstBriefItems();

/** Step 5 — first daily brief: the aha before entering Home. */
export function FirstBriefScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <OnboardingShell
      stepIndex={4}
      centered={false}
      footer={
        <AppButton size="lg" onPress={() => router.push('/onboarding/ready')}>
          Continue
        </AppButton>
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <OnboardingCopy
          eyebrow="Your first brief"
          title="Here’s what matters today."
          body="Chief distilled your workspace into a short list. This is how every morning starts."
        />

        <View style={[styles.list, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}>
          {FIRST_BRIEF_ITEMS.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.item,
                index < FIRST_BRIEF_ITEMS.length - 1 && {
                  borderBottomColor: colors.borderSubtle,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View style={styles.itemTop}>
                <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <PriorityIndicator priority={item.priority} />
              </View>
              <Text style={[styles.itemReason, { color: colors.textSecondary }]}>
                {item.reason}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    gap: spacing[24],
    paddingBottom: spacing[8],
  },
  list: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing[16],
    overflow: 'hidden',
  },
  item: {
    paddingVertical: spacing[16],
    gap: spacing[8],
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[12],
  },
  itemTitle: {
    ...typography.title3,
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
  },
  itemReason: {
    ...typography.footnote,
    lineHeight: 20,
    paddingRight: spacing[8],
  },
});
