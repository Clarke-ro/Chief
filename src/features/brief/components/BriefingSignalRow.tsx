import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PlatformLogo } from '@/components/ui/PlatformLogo';
import type { BriefingSignal } from '@/features/brief/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, spacing, typography } from '@/theme';

type BriefingSignalRowProps = {
  item: BriefingSignal;
  onPress?: () => void;
};

function splitBriefLines(summary: string): string[] {
  return summary
    .split(/\n+/)
    .map((line) => line.replace(/^[•\-\u2022]\s*/, '').trim())
    .filter(Boolean);
}

/** Brief thread row — tap expands a short list-style body summary. */
export function BriefingSignalRow({ item, onPress }: BriefingSignalRowProps) {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const lines = useMemo(() => splitBriefLines(item.summary), [item.summary]);

  const toggle = () => {
    setExpanded((prev) => !prev);
    onPress?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${item.title}. ${item.summary}. ${expanded ? 'Collapse' : 'Expand'} details`}
      onPress={toggle}
      style={({ pressed }) => [styles.block, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <PlatformLogo platform={item.platform} size={22} />
        <Text
          style={[styles.headline, { color: colors.text }]}
          numberOfLines={expanded ? undefined : 2}
        >
          {item.title}
        </Text>
        {expanded ? (
          <ChevronDown size={14} color={colors.textTertiary} strokeWidth={2} />
        ) : (
          <ChevronRight size={14} color={colors.textTertiary} strokeWidth={2} />
        )}
      </View>

      {expanded ? (
        <View style={styles.list}>
          {lines.map((line, index) => (
            <View key={`${index}-${line.slice(0, 12)}`} style={styles.listRow}>
              <Text style={[styles.bullet, { color: colors.textSecondary }]}>•</Text>
              <Text style={[styles.listText, { color: colors.textSecondary }]}>{line}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.preview, { color: colors.textSecondary }]} numberOfLines={2}>
          {lines[0] ?? item.summary}
        </Text>
      )}

      <Text style={[styles.timestamp, { color: colors.textTertiary }]}>{item.timestamp}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing[8],
  },
  pressed: { opacity: 0.72 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[8],
  },
  headline: {
    ...typography.footnote,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
    lineHeight: 20,
    flex: 1,
    minWidth: 0,
  },
  preview: {
    ...typography.caption,
    lineHeight: 18,
    paddingLeft: 22 + spacing[8],
  },
  list: {
    gap: spacing[8],
    paddingLeft: 22 + spacing[8],
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[8],
  },
  bullet: {
    ...typography.caption,
    lineHeight: 18,
    width: 10,
  },
  listText: {
    ...typography.caption,
    lineHeight: 18,
    flex: 1,
    minWidth: 0,
  },
  timestamp: {
    ...typography.caption,
    paddingLeft: 22 + spacing[8],
  },
});
