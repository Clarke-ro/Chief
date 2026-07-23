import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LegalDocument } from '@/features/legal/content';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, radius, spacing, typography } from '@/theme';

type LegalDocumentScreenProps = {
  document: LegalDocument;
};

/** Scrollable public legal document — no session required. */
export function LegalDocumentScreen({ document }: LegalDocumentScreenProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const onBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={onBack}
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: colors.bgSubtle, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={2.25} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text }]} numberOfLines={1}>
          {document.title}
        </Text>
        <View style={styles.backPlaceholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing[24]) + spacing[16] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>{document.title}</Text>
        <Text style={[styles.updated, { color: colors.textTertiary }]}>
          Last updated: {document.lastUpdated}
        </Text>
        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>{document.intro}</Text>

        {document.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={[styles.heading, { color: colors.text }]}>{section.heading}</Text>
            {section.paragraphs.map((p) => (
              <Text key={p.slice(0, 48)} style={[styles.paragraph, { color: colors.textSecondary }]}>
                {p}
              </Text>
            ))}
            {section.bullets?.length ? (
              <View style={styles.bullets}>
                {section.bullets.map((item) => (
                  <View key={item.slice(0, 48)} style={styles.bulletRow}>
                    <Text style={[styles.bulletMark, { color: colors.accent }]}>•</Text>
                    <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    gap: spacing[12],
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
  navTitle: {
    ...typography.subhead,
    fontFamily: fontFamily.semibold,
    flex: 1,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing[20],
    paddingTop: spacing[8],
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    gap: spacing[16],
  },
  title: {
    ...typography.title1,
    fontFamily: fontFamily.semibold,
  },
  updated: {
    ...typography.caption,
    marginTop: -spacing[8],
  },
  section: {
    gap: spacing[8],
  },
  heading: {
    ...typography.title3,
    fontFamily: fontFamily.semibold,
    marginTop: spacing[8],
  },
  paragraph: {
    ...typography.body,
    lineHeight: 24,
  },
  bullets: {
    gap: spacing[8],
    paddingTop: spacing[4],
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[8],
  },
  bulletMark: {
    ...typography.body,
    lineHeight: 24,
    width: 14,
  },
  bulletText: {
    ...typography.body,
    lineHeight: 24,
    flex: 1,
  },
});
