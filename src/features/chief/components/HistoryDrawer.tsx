import { useEffect, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/hooks/useThemeColors';

const DURATION_IN = 280;
const DURATION_OUT = 240;

type HistoryDrawerProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

/** Chat history panel that slides in from the left over a dimmed backdrop. */
export function HistoryDrawer({ visible, onClose, children }: HistoryDrawerProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(Math.round(width * 0.86), 360);
  const translateX = useSharedValue(-drawerWidth);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateX.value = -drawerWidth;
      backdrop.value = 0;
      translateX.value = withTiming(0, {
        duration: DURATION_IN,
        easing: Easing.out(Easing.cubic),
      });
      backdrop.value = withTiming(1, {
        duration: DURATION_IN,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [visible, drawerWidth, translateX, backdrop]);

  const dismiss = () => {
    translateX.value = withTiming(
      -drawerWidth,
      {
        duration: DURATION_OUT,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) runOnJS(onClose)();
      },
    );
    backdrop.value = withTiming(0, {
      duration: DURATION_OUT,
      easing: Easing.in(Easing.cubic),
    });
  };

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      {/* Modal hosts its own root — wrap so touches work reliably */}
      <GestureHandlerRootView style={styles.root}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdrop, backdropStyle]}
        />

        {/* Tap target covering everything to the right of the panel */}
        <Pressable
          onPress={dismiss}
          style={[styles.outside, { left: drawerWidth }]}
          accessibilityRole="button"
          accessibilityLabel="Close chat history"
        />

        <Animated.View
          style={[
            styles.drawer,
            drawerStyle,
            {
              width: drawerWidth,
              paddingTop: insets.top,
              backgroundColor: colors.bgElevated,
              borderRightColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.drawerInner}>{children}</View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  outside: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    // Android often ignores empty Pressables without a fill
    backgroundColor: 'transparent',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    zIndex: 2,
  },
  drawerInner: {
    flex: 1,
  },
});
