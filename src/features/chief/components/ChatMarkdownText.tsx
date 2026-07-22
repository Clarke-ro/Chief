import { Fragment, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { chatTypography, fontFamily, spacing } from '@/theme';

type ChatMarkdownTextProps = {
  content: string;
};

type Segment =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] };

/** Lightweight markdown: paragraphs, **bold**, and `-` bullets (nested via indent). */
export function ChatMarkdownText({ content }: ChatMarkdownTextProps) {
  const colors = useThemeColors();
  const segments = useMemo(() => parseSegments(content), [content]);

  return (
    <View style={styles.wrap}>
      {segments.map((seg, i) => {
        if (seg.type === 'ul') {
          return (
            <View key={`ul-${i}`} style={styles.list}>
              {seg.items.map((item, j) => {
                const depth = item.match(/^\s*/)?.[0].length ?? 0;
                const text = item.trim().replace(/^[-•*]\s*/, '');
                const pad = Math.min(Math.floor(depth / 2), 3) * spacing[12];
                return (
                  <View key={`li-${j}`} style={[styles.li, { paddingLeft: pad }]}>
                    <Text style={[styles.bullet, { color: colors.text }]}>•</Text>
                    <Text style={[styles.body, { color: colors.text, flex: 1 }]}>
                      {renderInline(text, colors.text)}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        }

        return (
          <Text key={`p-${i}`} style={[styles.body, { color: colors.text }]}>
            {renderInline(seg.text, colors.text)}
          </Text>
        );
      })}
    </View>
  );
}

function parseSegments(raw: string): Segment[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const out: Segment[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (para.length === 0) return;
    out.push({ type: 'p', text: para.join(' ').trim() });
    para = [];
  };
  const flushList = () => {
    if (list.length === 0) return;
    out.push({ type: 'ul', items: [...list] });
    list = [];
  };

  for (const line of lines) {
    if (/^\s*[-•*]\s+/.test(line)) {
      flushPara();
      list.push(line);
      continue;
    }
    if (line.trim() === '') {
      flushPara();
      flushList();
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  return out;
}

function renderInline(text: string, color: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const bold = part.startsWith('**') && part.endsWith('**');
    const value = bold ? part.slice(2, -2) : part;
    if (!value) return null;
    return (
      <Fragment key={i}>
        <Text
          style={
            bold
              ? { color, fontFamily: fontFamily.semibold, fontWeight: '600' }
              : { color }
          }
        >
          {value}
        </Text>
      </Fragment>
    );
  });
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[12],
  },
  body: {
    ...chatTypography.body,
  },
  list: {
    gap: spacing[4],
  },
  li: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[8],
  },
  bullet: {
    ...chatTypography.body,
    width: 14,
  },
});
