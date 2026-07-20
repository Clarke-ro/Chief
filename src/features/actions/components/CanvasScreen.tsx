import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Maximize2, Minimize2, X } from 'lucide-react-native';

import { CanvasArtifactCard } from '@/features/actions/components/CanvasArtifactCard';
import type { ActionableTask } from '@/features/actions/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, spacing, typography } from '@/theme';

export type CanvasVariant = 'embedded' | 'panel' | 'fullscreen';

type CanvasScreenProps = {
  task: ActionableTask;
  variant?: CanvasVariant;
  onClose: () => void;
  onToggleExpand?: () => void;
};

/**
 * Outside-chat canvas (Home / Focus): preparing → editable artifact.
 * Open Gmail / Slack lives on the card; no separate chat flow here.
 */
export function CanvasScreen({
  task,
  variant = 'fullscreen',
  onClose,
  onToggleExpand,
}: CanvasScreenProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [working, setWorking] = useState(true);

  const embedded = variant === 'embedded';
  const fullscreen = variant === 'fullscreen';
  const panel = variant === 'panel';

  useEffect(() => {
    setWorking(true);
    const t = setTimeout(() => setWorking(false), 900);
    return () => clearTimeout(t);
  }, [task.id]);

  const topPad = embedded ? 0 : fullscreen || panel ? insets.top : 0;
  const bottomPad = embedded ? spacing[12] : Math.max(insets.bottom, spacing[16]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close canvas"
          onPress={onClose}
          hitSlop={12}
          style={styles.iconBtn}
        >
          <X size={22} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {task.label}
        </Text>
        {onToggleExpand ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={fullscreen ? 'Exit full screen' : 'Expand canvas'}
            onPress={onToggleExpand}
            hitSlop={12}
            style={styles.iconBtn}
          >
            {fullscreen ? (
              <Minimize2 size={20} color={colors.text} strokeWidth={2} />
            ) : (
              <Maximize2 size={20} color={colors.text} strokeWidth={2} />
            )}
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      {working ? (
        <View style={styles.working}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={[styles.workingTitle, { color: colors.text }]}>
            Preparing draft…
          </Text>
          <Text style={[styles.workingSub, { color: colors.textSecondary }]}>
            Chief is putting this together for you.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <CanvasArtifactCard task={task} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    gap: spacing[8],
  },
  headerTitle: {
    ...typography.subhead,
    fontFamily: fontFamily.semibold,
    flex: 1,
    textAlign: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  working: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    paddingHorizontal: spacing[32],
  },
  workingTitle: {
    ...typography.title3,
    marginTop: spacing[8],
  },
  workingSub: {
    ...typography.body,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[12],
    paddingTop: spacing[8],
  },
});
