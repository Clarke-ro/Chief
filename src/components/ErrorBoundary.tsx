import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
  resetKey: number;
};

/**
 * Root safety net — keeps a white-screen crash from taking down the whole app.
 * Preserves UX; does not redesign. Theme tokens avoided so this works before providers.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  private onRetry = () => {
    this.setState((prev) => ({ error: null, resetKey: prev.resetKey + 1 }));
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.root} accessibilityRole="alert">
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            Chief hit an unexpected error. You can try again without losing the rest of your
            session.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={this.onRetry}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonLabel}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    return <View style={styles.flex} key={this.state.resetKey}>{this.props.children}</View>;
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
    backgroundColor: '#F7F7F8',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111113',
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B6B76',
    textAlign: 'center',
    maxWidth: 320,
  },
  button: {
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#111113',
  },
  pressed: { opacity: 0.85 },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
