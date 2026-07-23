import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChiefLogo } from '@/features/chief/components/ChiefLogo';
import { LEGAL_PRIVACY_URL, LEGAL_TERMS_URL } from '@/features/legal';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, radius, spacing, typography } from '@/theme';

/**
 * Public marketing homepage for Google OAuth brand verification.
 * Must name the app “Chief”, explain purpose, and link Privacy / Terms — not a login-only page.
 */
export function MarketingHomeScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing[24]) + spacing[16] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <ChiefLogo size={48} />
          <Text
            accessibilityRole="header"
            style={[styles.brand, { color: colors.text }]}
          >
            Chief
          </Text>
        </View>

        <Text style={[styles.headline, { color: colors.text }]}>
          Your AI chief of staff for real work
        </Text>
        <Text style={[styles.lede, { color: colors.textSecondary }]}>
          Chief connects to the tools you already use — like Gmail, Google Calendar, Google
          Tasks, and Drive — then analyzes your day, surfaces Top Priorities, builds a daily
          brief, and helps you schedule and execute next actions.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>What Chief does</Text>
          {[
            'Prioritize what matters today from email, calendar, and tasks',
            'Deliver a daily brief with context, risks, and recommended actions',
            'Ask Chief for plans, drafts, and next steps grounded in your workspace',
            'Connect Google and other apps so sync stays under your control',
          ].map((line) => (
            <View key={line} style={styles.bulletRow}>
              <Text style={[styles.bullet, { color: colors.accent }]}>•</Text>
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{line}</Text>
            </View>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Chief app"
          onPress={() => router.push('/onboarding')}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: colors.accent,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Text style={styles.ctaLabel}>Open Chief</Text>
          <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.25} />
        </Pressable>

        <Text style={[styles.legalIntro, { color: colors.textTertiary }]}>
          By using Chief you agree to our policies.
        </Text>
        <View style={styles.legalRow}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
            onPress={() => router.push('/legal/privacy')}
            hitSlop={8}
          >
            <Text style={[styles.legalLink, { color: colors.accent }]}>Privacy Policy</Text>
          </Pressable>
          <Text style={{ color: colors.textTertiary }}>·</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Terms of Service"
            onPress={() => router.push('/legal/terms')}
            hitSlop={8}
          >
            <Text style={[styles.legalLink, { color: colors.accent }]}>Terms of Service</Text>
          </Pressable>
        </View>

        {/* Crawl/assist text — mirrors official URLs for Google reviewers */}
        <Text style={[styles.urlHint, { color: colors.textTertiary }]}>
          {LEGAL_PRIVACY_URL}
          {'\n'}
          {LEGAL_TERMS_URL}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: spacing[24],
    paddingTop: spacing[32],
    gap: spacing[16],
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    marginBottom: spacing[8],
  },
  brand: {
    ...typography.display,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1,
    fontFamily: fontFamily.semibold,
    fontWeight: '700',
  },
  headline: {
    ...typography.title1,
    fontFamily: fontFamily.semibold,
    letterSpacing: -0.4,
  },
  lede: {
    ...typography.body,
    lineHeight: 26,
  },
  card: {
    marginTop: spacing[8],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing[16],
    gap: spacing[10],
  },
  cardTitle: {
    ...typography.title3,
    fontFamily: fontFamily.semibold,
    marginBottom: spacing[4],
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[8],
  },
  bullet: {
    ...typography.body,
    lineHeight: 24,
    width: 14,
  },
  bulletText: {
    ...typography.body,
    lineHeight: 24,
    flex: 1,
  },
  cta: {
    marginTop: spacing[8],
    minHeight: 52,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[20],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
  },
  ctaLabel: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
  legalIntro: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing[8],
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[8],
  },
  legalLink: {
    ...typography.subhead,
    fontFamily: fontFamily.semibold,
    textDecorationLine: 'underline',
  },
  urlHint: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: spacing[8],
  },
});
