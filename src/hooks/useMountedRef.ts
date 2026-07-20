import { useEffect, useRef } from 'react';

/** True while the component is mounted — use to ignore async results after unmount. */
export function useMountedRef() {
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return mounted;
}
