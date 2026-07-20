import { Stack, useLocalSearchParams } from 'expo-router';

import { dispatchFocusAction } from '@/features/actions';
import { FocusDetailScreen } from '@/features/brief/components/FocusDetailScreen';
import type { FocusAction } from '@/features/brief/types';
import { workspaceNav } from '@/services';
import { useWorkspaceStore } from '@/stores';

export default function FocusDetailsRoute() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;
  const item = useWorkspaceStore((s) =>
    id ? s.brief.focus.find((focus) => focus.id === id) : undefined,
  );

  const onActionPress = (action: FocusAction) => {
    void dispatchFocusAction(item?.title ?? 'Focus item', action, 'focus');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />
      <FocusDetailScreen
        item={item}
        onBack={() => workspaceNav.back(() => workspaceNav.home())}
        onActionPress={onActionPress}
      />
    </>
  );
}
