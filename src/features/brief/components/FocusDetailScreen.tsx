import { ArrowLeft, MoreHorizontal, Star } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppChip, EmptyState, PlatformLogo } from '@/components/ui';
import type { FocusAction, FocusItem } from '@/features/brief/types';
import { PRIORITY_STARS } from '@/features/brief/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, radius, spacing, typography } from '@/theme';

type FocusDetailScreenProps = {
  item?: FocusItem;
  onBack: () => void;
  onActionPress?: (action: FocusAction) => void;
  onMore?: () => void;
};

function PriorityStars({ count, color }: { count: number; color: string }) {
  return (
    <View style={styles.stars}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={14}
          color={color}
          fill={i < count ? color : 'transparent'}
          strokeWidth={2}
        />
      ))}
      <Text style={[styles.starCount, { color }]}>({count}/5)</Text>
    </View>
  );
}

/** Focus detail — metrics, why/impact, recommendation, bold action CTAs. */
export function FocusDetailScreen({
  item,
  onBack,
  onActionPress,
  onMore,
}: FocusDetailScreenProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  if (!item) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <EmptyState
          title="Focus not found"
          description="This priority may have been cleared or the link is invalid."
          actionLabel="Back to Home"
          onAction={onBack}
        />
      </View>
    );
  }

  const stars = PRIORITY_STARS[item.priority];
  const priorityColor = colors.priority[item.priority];
  const confidencePct = Math.round(item.confidence * 100);
  const footerPad = Math.max(insets.bottom, spacing[16]);
  const footerHeight = spacing[12] + 40 + footerPad;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={onBack}
          style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </Pressable>
        {onMore ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More options"
            hitSlop={12}
            onPress={onMore}
            style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
          >
            <MoreHorizontal size={22} color={colors.text} strokeWidth={2} />
          </Pressable>
        ) : (
          <View style={styles.navBtn} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: footerHeight + spacing[16] }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.platformRow}>
            <PlatformLogo platform={item.platform} size={22} />
            <Text style={[styles.platform, { color: colors.textSecondary }]}>
              {item.urgencyLabel}
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          <View style={[styles.urgency, { backgroundColor: `${priorityColor}18` }]}>
            <Text style={[styles.urgencyText, { color: priorityColor }]}>
              {item.urgencyLabel.toUpperCase()}
            </Text>
          </View>
        </View>

        <View
          style={[styles.card, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}
        >
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Priority</Text>
              <PriorityStars count={stars} color={priorityColor} />
            </View>
            <View style={styles.metric}>
              <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Confidence</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{confidencePct}%</Text>
            </View>
            <View style={styles.metric}>
              <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Est. Time</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{item.estimatedTime}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.copyBlock}>
            <Text style={[styles.copyTitle, { color: colors.text }]}>
              {item.aboutTitle?.trim() || 'What’s going on'}
            </Text>
            <Text style={[styles.copyBody, { color: colors.textSecondary }]}>
              {item.aboutBody?.trim() || item.whyImportant}
            </Text>
          </View>

          <View style={styles.copyBlock}>
            <Text style={[styles.copyTitle, { color: colors.text }]}>
              {item.actionTitle?.trim() || 'What to do'}
            </Text>
            <Text style={[styles.copyBody, { color: colors.textSecondary }]}>
              {item.actionBody?.trim() || item.delayImpact}
            </Text>
          </View>
        </View>

        <View
          style={[styles.card, { backgroundColor: colors.bgElevated, borderColor: colors.borderSubtle }]}
        >
          <Text style={[styles.copyTitle, { color: colors.text }]}>Recommendation</Text>
          <Text style={[styles.copyBody, { color: colors.textSecondary }]}>
            {item.aiRecommendation}
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.bg,
            borderTopColor: colors.borderSubtle,
            paddingBottom: footerPad,
          },
        ]}
      >
        <View style={styles.actionRow}>
          {item.actions.map((action) => (
            <AppChip
              key={action.id}
              label={action.label}
              tone={action.tone ?? 'neutral'}
              size="sm"
              onPress={() => onActionPress?.(action)}
            />
          ))}
        </View>
      </View>
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
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing[20],
    gap: spacing[16],
  },
  hero: {
    gap: spacing[8],
    paddingTop: spacing[8],
    paddingBottom: spacing[8],
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  platform: {
    ...typography.subhead,
    fontFamily: fontFamily.medium,
    fontWeight: '500',
  },
  title: {
    ...typography.title1,
    fontFamily: fontFamily.bold,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  urgency: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: radius.full,
  },
  urgencyText: {
    ...typography.caption,
    fontFamily: fontFamily.bold,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing[20],
    gap: spacing[16],
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  metric: {
    flex: 1,
    gap: spacing[8],
  },
  metricLabel: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    fontWeight: '500',
  },
  metricValue: {
    ...typography.title3,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
  },
  stars: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
  },
  starCount: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    fontWeight: '600',
    marginLeft: spacing[4],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  copyBlock: {
    gap: spacing[8],
  },
  copyTitle: {
    ...typography.subhead,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
  },
  copyBody: {
    ...typography.callout,
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing[16],
    paddingTop: spacing[12],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing[8],
  },
});
