import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { TypewriterPhrase } from '@/components/ui';
import { useResolvedColorScheme } from '@/hooks/useResolvedColorScheme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, radius, spacing, typography } from '@/theme';

/** Workspace / priorities / brief prompts for the empty-state typewriter. */
export const CHIEF_ASK_PHRASES = [
  'your investor email',
  'reviewing PR #182',
  "today's brief",
  'your top priorities',
  'rescheduling Sprint Planning',
  'the empty-state decision',
  'your calendar conflicts',
] as const;

type ChiefComposerProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  /** Docked under an active thread — hide the large empty-state heading */
  compact?: boolean;
  /** Override rotating phrases (defaults to workspace / priority examples) */
  askPhrases?: readonly string[];
};

/** Centered ask field with optional typewriter heading. */
export function ChiefComposer({
  value,
  onChangeText,
  onSend,
  compact = false,
  askPhrases = CHIEF_ASK_PHRASES,
}: ChiefComposerProps) {
  const colors = useThemeColors();
  const scheme = useResolvedColorScheme();
  const canSend = value.trim().length > 0;
  const isDark = scheme === 'dark';

  // Fixed pair — never swap when typing (that caused black-on-black / white-on-white)
  // Light: black chip + white ↑ · Dark: white chip + black ↑
  const sendBg = isDark ? '#FFFFFF' : '#000000';
  const sendFg = isDark ? '#000000' : '#FFFFFF';

  const handleSend = () => {
    if (!canSend) return;
    Keyboard.dismiss();
    onSend();
  };

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      {!compact ? (
        <Text style={[styles.heading, { color: colors.text }]} accessibilityRole="header">
          Ask Chief about{' '}
          <TypewriterPhrase
            phrases={askPhrases}
            style={[styles.heading, { color: colors.accent }]}
            accessibilityLabel="Suggested things to ask Chief about"
          />
        </Text>
      ) : null}

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.bgElevated,
            borderColor: colors.border,
            shadowColor: colors.text,
          },
        ]}
      >
        <View style={styles.inputWrap}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder="Type a question…"
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={2000}
            style={[styles.input, { color: colors.text }]}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            accessibilityLabel="Message to Chief"
            selectionColor={colors.accent}
          />
        </View>

        <View
          collapsable={false}
          style={[
            styles.sendShell,
            {
              backgroundColor: sendBg,
              // Dim only when empty — colors stay identical while typing
              opacity: canSend ? 1 : 0.4,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !canSend }}
            onPress={handleSend}
            hitSlop={4}
            style={({ pressed }) => [
              styles.sendPress,
              { opacity: pressed && canSend ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.sendGlyph, { color: sendFg }]} allowFontScaling={false}>
              ↑
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing[48],
  },
  rootCompact: {
    maxWidth: '100%',
    gap: spacing[12],
  },
  heading: {
    ...typography.title2,
    fontFamily: fontFamily.semibold,
    letterSpacing: -0.4,
    textAlign: 'center',
    paddingHorizontal: spacing[12],
    minHeight: 56,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[12],
    width: '100%',
    minHeight: 56,
    paddingLeft: spacing[16],
    paddingRight: spacing[12],
    paddingVertical: spacing[12],
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 2,
    overflow: 'visible',
  },
  inputWrap: {
    flex: 1,
    minWidth: 0,
  },
  input: {
    ...typography.body,
    fontFamily: fontFamily.regular,
    width: '100%',
    maxHeight: 120,
    paddingTop: spacing[8],
    paddingBottom: spacing[8],
    textAlignVertical: 'top',
  },
  sendShell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    flexShrink: 0,
    overflow: 'hidden',
  },
  sendPress: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendGlyph: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
