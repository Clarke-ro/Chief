import type { ConversationAction } from '@/features/chief/types';

/**
 * Strip model TeX/math delimiters and parse an optional trailing ACTIONS line
 * into clickable chips. Keeps body as plain markdown-friendly text.
 */
export function parseChiefReply(raw: string): {
  content: string;
  actions?: ConversationAction[];
} {
  let text = stripMathDelimiters(raw.replace(/\r\n/g, '\n').trim());

  const actionsMatch = text.match(/\nACTIONS:\s*(.+)\s*$/i);
  let actions: ConversationAction[] | undefined;
  if (actionsMatch) {
    text = text.slice(0, actionsMatch.index).trimEnd();
    const labels = actionsMatch[1]
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 3);
    if (labels.length > 0) {
      actions = labels.map((label, index) => ({
        id: `chief-action-${index}-${slug(label)}`,
        label,
      }));
    }
  }

  return { content: text, actions };
}

/** Remove $...$, $$...$$, \\(...\\), \\[...\\] wrappers; keep inner prose. */
export function stripMathDelimiters(input: string): string {
  let text = input;
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, '$1');
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, '$1');
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, '$1');
  // Single $...$ but not currency-like "$50" alone at word start with digits only —
  // unwrap when the interior has letters or operators typical of math.
  text = text.replace(/\$([^$\n]{1,120})\$/g, (_full, inner: string) => {
    if (/^[0-9]+([.,][0-9]+)?$/.test(inner.trim())) {
      return `USD ${inner.trim()}`;
    }
    return inner;
  });
  return text;
}

function slug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}
