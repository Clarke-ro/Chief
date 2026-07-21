import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  buildCanvasIntro,
  canvasRelatedActions,
  dispatchAction,
  type ActionableTask,
} from '@/features/actions';
import { ChatHistorySidebar } from '@/features/chief/components/ChatHistorySidebar';
import { ChiefComposer } from '@/features/chief/components/ChiefComposer';
import { ChiefHeader } from '@/features/chief/components/ChiefHeader';
import { ConversationThread } from '@/features/chief/components/ConversationThread';
import { HistoryDrawer } from '@/features/chief/components/HistoryDrawer';
import type { ConversationTurn } from '@/features/chief/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ApiError, ApiNetworkError } from '@/services/api/client';
import { chiefChatRepository } from '@/services/repositories/chiefChatRepository';
import { useWorkspaceStore } from '@/stores';
import { spacing } from '@/theme';

const WIDE_BREAKPOINT = 768;

function offlineChiefReply(prompt: string): ConversationTurn {
  const clipped = `${prompt.slice(0, 72)}${prompt.length > 72 ? '…' : ''}`;
  return {
    id: `c-${Date.now() + 1}`,
    role: 'chief',
    content: `I couldn't reach the live workspace model for "${clipped}". Check your connection and try again — Chief answers from your synced brief, not a canned script.`,
  };
}

/**
 * Chief — chat surface. Actionables continue as chat turns (user bubble → Chief reply),
 * matching the clean ChatGPT-style thread — no bulky embedded canvas.
 */
export function ChiefScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;
  const params = useLocalSearchParams<{
    prompt?: string;
    focusId?: string;
    /** Nonce from workspaceNav.askChief so repeat asks re-apply */
    nav?: string;
  }>();

  const sessions = useWorkspaceStore((s) => s.sessions);
  const activeSessionId = useWorkspaceStore((s) => s.activeSessionId);
  const setActiveSessionId = useWorkspaceStore((s) => s.setActiveSessionId);
  const appendChiefTurns = useWorkspaceStore((s) => s.appendChiefTurns);
  const [draft, setDraft] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const closeHistory = useCallback(() => setHistoryOpen(false), []);
  const dismissKeyboard = useCallback(() => Keyboard.dismiss(), []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const selectSession = useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId);
      setDraft('');
      closeHistory();
    },
    [closeHistory, setActiveSessionId],
  );

  const startNewChat = useCallback(() => {
    setActiveSessionId(null);
    setDraft('');
    closeHistory();
  }, [closeHistory, setActiveSessionId]);

  const appendTurns = useCallback(
    (userTurn: ConversationTurn, chiefTurn: ConversationTurn, titleSeed: string) => {
      appendChiefTurns(userTurn, chiefTurn, titleSeed);
    },
    [appendChiefTurns],
  );

  const appendPrompt = useCallback(
    (prompt: string) => {
      const text = prompt.trim();
      if (!text) return;
      setDraft('');
      const userTurn: ConversationTurn = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: text,
      };

      const state = useWorkspaceStore.getState();
      const history =
        state.sessions.find((session) => session.id === state.activeSessionId)?.turns ?? [];
      const focusId =
        typeof params.focusId === 'string' && params.focusId.trim()
          ? params.focusId.trim()
          : undefined;

      void (async () => {
        if (!chiefChatRepository.shouldUseLiveChat()) {
          appendTurns(userTurn, offlineChiefReply(text), text);
          return;
        }

        try {
          const live = await chiefChatRepository.send(text, {
            history,
            focusId,
          });
          const chiefTurn: ConversationTurn = {
            id: `c-${Date.now() + 1}`,
            role: 'chief',
            content: live.content.trim() || 'I need a bit more context to help with that.',
          };
          appendTurns(userTurn, chiefTurn, text);
        } catch (error) {
          const detail =
            error instanceof ApiError
              ? error.serverMessage ??
                (error.status === 503
                  ? 'Chief could not reach a language model right now.'
                  : `Request failed (${error.status}).`)
              : error instanceof ApiNetworkError
                ? error.message
                : 'Something went wrong.';
          appendTurns(
            userTurn,
            {
              id: `c-${Date.now() + 1}`,
              role: 'chief',
              content: `${detail} I couldn't finish this reply with your live workspace context.`,
            },
            text,
          );
        }
      })();
    },
    [appendTurns, params.focusId],
  );

  /** Actionable → user bubble + intro + editable canvas; related chips (not Open Gmail) */
  const appendActionAsChat = useCallback(
    (task: ActionableTask) => {
      const userTurn: ConversationTurn = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: task.label,
      };
      const related = canvasRelatedActions(task);
      const chiefTurn: ConversationTurn = {
        id: `c-${Date.now() + 1}`,
        role: 'chief',
        content: buildCanvasIntro(task),
        canvas: task,
        actionsLead: related.length > 0 ? 'Would you like me to' : undefined,
        actions: related.length > 0 ? related : undefined,
      };
      appendTurns(userTurn, chiefTurn, task.label);
    },
    [appendTurns],
  );

  useEffect(() => {
    const seed = typeof params.prompt === 'string' ? params.prompt.trim() : '';
    if (!seed) return;
    setActiveSessionId(null);
    setDraft(seed);
    closeHistory();
    // Clear handoff params so back/tab switches do not re-seed the composer
    router.setParams({ prompt: '', focusId: '', nav: '' });
  }, [params.prompt, params.focusId, params.nav, router, closeHistory]);

  const onSend = useCallback(() => appendPrompt(draft), [appendPrompt, draft]);

  const onAction = useCallback(
    async (task: ActionableTask) => {
      Keyboard.dismiss();
      const result = await dispatchAction({
        kind: 'task',
        task,
        source: 'chief_chat',
        embedInChat: true,
      });
      if (result.outcome === 'canvas_embedded') {
        appendActionAsChat(result.task);
      }
      // ask_chief / handoff are handled inside the router
    },
    [appendActionAsChat],
  );

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );
  const hasConversation = Boolean(activeSession && activeSession.turns.length > 0);

  const footerPad = keyboardVisible
    ? spacing[12]
    : Platform.OS === 'ios'
      ? 49 + insets.bottom
      : Math.max(insets.bottom, 8);

  const historySidebar = (
    <ChatHistorySidebar
      sessions={sessions}
      activeSessionId={activeSessionId}
      onSelect={selectSession}
    />
  );

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          backgroundColor: colors.bg,
        },
      ]}
    >
      <View style={styles.shell}>
        {isWide ? (
          <View style={[styles.sidebarColumn, { borderRightColor: colors.borderSubtle }]}>
            {historySidebar}
          </View>
        ) : null}

        <KeyboardAvoidingView
          style={styles.main}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <Pressable onPress={dismissKeyboard} accessible={false}>
            <ChiefHeader
              showHistoryToggle={!isWide}
              onToggleHistory={() => {
                dismissKeyboard();
                setHistoryOpen(true);
              }}
              onNewChat={() => {
                dismissKeyboard();
                startNewChat();
              }}
              sessionTitle={hasConversation ? activeSession?.title : null}
            />
          </Pressable>

          {hasConversation && activeSession ? (
            <>
              <ScrollView
                style={styles.threadScroll}
                contentContainerStyle={styles.threadContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                onScrollBeginDrag={dismissKeyboard}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={Platform.OS === 'android'}
              >
                <Pressable onPress={dismissKeyboard} accessible={false}>
                  <ConversationThread turns={activeSession.turns} onAction={onAction} />
                </Pressable>
              </ScrollView>

              <View
                style={[
                  styles.composerDock,
                  {
                    paddingBottom: footerPad,
                    borderTopColor: colors.borderSubtle,
                    backgroundColor: colors.bg,
                  },
                ]}
              >
                <ChiefComposer
                  value={draft}
                  onChangeText={setDraft}
                  onSend={onSend}
                  compact
                />
              </View>
            </>
          ) : (
            <Pressable
              style={[styles.center, { paddingBottom: footerPad }]}
              onPress={dismissKeyboard}
              accessible={false}
            >
              <View style={styles.askBlock}>
                <ChiefComposer
                  value={draft}
                  onChangeText={setDraft}
                  onSend={onSend}
                />
              </View>
            </Pressable>
          )}
        </KeyboardAvoidingView>
      </View>

      {!isWide ? (
        <HistoryDrawer visible={historyOpen} onClose={closeHistory}>
          {historySidebar}
        </HistoryDrawer>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  shell: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarColumn: {
    width: 320,
    maxWidth: '40%',
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  threadScroll: {
    flex: 1,
  },
  threadContent: {
    paddingBottom: spacing[24],
    flexGrow: 1,
  },
  composerDock: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[12],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[24],
  },
  askBlock: {
    width: '100%',
    maxWidth: 560,
    alignItems: 'center',
    marginTop: -spacing[64],
  },
});
