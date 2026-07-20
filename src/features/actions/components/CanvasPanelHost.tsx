import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { CanvasScreen } from '@/features/actions/components/CanvasScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useCanvasStore } from '@/stores';
import { radius } from '@/theme';

const WIDE_BREAKPOINT = 768;
const PANEL_RATIO = 0.72;

/**
 * Global slide-over canvas for non-chat surfaces.
 * ~72% panel by default; expand (top-right) goes fullscreen.
 */
export function CanvasPanelHost() {
  const colors = useThemeColors();
  const { width, height } = useWindowDimensions();
  const task = useCanvasStore((s) => s.task);
  const mode = useCanvasStore((s) => s.mode);
  const close = useCanvasStore((s) => s.close);
  const expand = useCanvasStore((s) => s.expand);
  const collapse = useCanvasStore((s) => s.collapse);

  const visible = Boolean(task);
  const fullscreen = mode === 'fullscreen';
  const isWide = width >= WIDE_BREAKPOINT;

  if (!task) return null;

  const panelStyle = fullscreen
    ? styles.fill
    : isWide
      ? {
          position: 'absolute' as const,
          top: 0,
          right: 0,
          bottom: 0,
          width: Math.max(Math.round(width * PANEL_RATIO), 320),
          borderTopLeftRadius: radius.xl,
          borderBottomLeftRadius: radius.xl,
          overflow: 'hidden' as const,
          backgroundColor: colors.bgElevated,
          borderLeftWidth: StyleSheet.hairlineWidth,
          borderLeftColor: colors.borderSubtle,
        }
      : {
          position: 'absolute' as const,
          left: 0,
          right: 0,
          bottom: 0,
          height: Math.round(height * PANEL_RATIO),
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          overflow: 'hidden' as const,
          backgroundColor: colors.bgElevated,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.borderSubtle,
        };

  return (
    <Modal
      visible={visible}
      animationType={fullscreen ? 'fade' : 'slide'}
      transparent={!fullscreen}
      onRequestClose={close}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.root}>
        {!fullscreen ? (
          <Pressable
            style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Dismiss canvas"
          />
        ) : null}

        <View style={fullscreen ? [styles.fill, { backgroundColor: colors.bgElevated }] : panelStyle}>
          <CanvasScreen
            task={task}
            variant={fullscreen ? 'fullscreen' : 'panel'}
            onClose={close}
            onToggleExpand={fullscreen ? collapse : expand}
          />
        </View>
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
  },
  fill: {
    flex: 1,
  },
});
