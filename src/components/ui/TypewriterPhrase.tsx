import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Text, type StyleProp, type TextStyle } from 'react-native';

type TypewriterPhraseProps = {
  phrases: readonly string[];
  /** ms per character when typing */
  typeMs?: number;
  /** ms per character when deleting */
  deleteMs?: number;
  /** pause after a phrase is fully typed */
  holdMs?: number;
  /** pause after fully deleted before next phrase */
  gapMs?: number;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

/**
 * Cycles through phrases with a type → hold → erase → next loop.
 * Nest inside a parent <Text> for inline headlines. Respects Reduce Motion.
 */
export function TypewriterPhrase({
  phrases,
  typeMs = 42,
  deleteMs = 28,
  holdMs = 1600,
  gapMs = 320,
  style,
  accessibilityLabel,
}: TypewriterPhraseProps) {
  const list = useMemo(
    () => (phrases.length > 0 ? [...phrases] : ['']),
    // Stable when content is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phrases.join('\u0001')],
  );

  const [display, setDisplay] = useState('');
  const [cursorOn, setCursorOn] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setReduceMotion(enabled);
        if (enabled) setDisplay(list[0] ?? '');
      }
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
      if (enabled) {
        setDisplay(list[0] ?? '');
        setCursorOn(false);
      }
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, [list]);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(list[0] ?? '');
      setCursorOn(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let phraseIndex = 0;
    let text = '';
    let phase: 'typing' | 'holding' | 'deleting' | 'gap' = 'typing';

    const schedule = (ms: number, fn: () => void) => {
      timer = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    };

    const step = () => {
      if (cancelled) return;
      const full = list[phraseIndex % list.length] ?? '';

      if (phase === 'typing') {
        setCursorOn(true);
        if (text.length < full.length) {
          text = full.slice(0, text.length + 1);
          setDisplay(text);
          schedule(typeMs, step);
          return;
        }
        phase = 'holding';
        schedule(holdMs, step);
        return;
      }

      if (phase === 'holding') {
        phase = 'deleting';
        schedule(0, step);
        return;
      }

      if (phase === 'deleting') {
        setCursorOn(true);
        if (text.length > 0) {
          text = text.slice(0, -1);
          setDisplay(text);
          schedule(deleteMs, step);
          return;
        }
        phase = 'gap';
        schedule(0, step);
        return;
      }

      phraseIndex = (phraseIndex + 1) % list.length;
      phase = 'typing';
      schedule(gapMs, step);
    };

    setDisplay('');
    step();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [deleteMs, gapMs, holdMs, list, reduceMotion, typeMs]);

  const label =
    accessibilityLabel ??
    (list.length > 0 && list[0] ? list.join(', ') : undefined);

  return (
    <Text style={style} accessibilityLabel={label}>
      {display}
      {cursorOn ? '|' : null}
    </Text>
  );
}
