import { Search, X } from 'lucide-react-native';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { fontFamily, radius, spacing, typography } from '@/theme';

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  autoFocus?: boolean;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  onClear,
  autoFocus,
}: SearchBarProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.bgSubtle,
          borderRadius: radius.lg,
        },
      ]}
    >
      <Search size={18} color={colors.textTertiary} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={[
          styles.input,
          {
            color: colors.text,
            fontFamily: fontFamily.regular,
          },
        ]}
        accessibilityLabel="Search"
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
          onPress={() => {
            onChangeText('');
            onClear?.();
          }}
        >
          <X size={16} color={colors.textTertiary} strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    marginHorizontal: spacing[20],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
  },
  input: {
    flex: 1,
    ...typography.callout,
    padding: 0,
  },
});
