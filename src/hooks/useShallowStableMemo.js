import { useRef } from 'react';

/**
 * Custom hook to stabilize the reference of an object (like context value).
 * It returns the exact same object reference if a shallow equality check passes.
 * 
 * @template T
 * @param {T} nextValue
 * @returns {T}
 */
export function useShallowStableMemo(nextValue) {
  const ref = useRef(nextValue);
  const prev = ref.current;

  if (prev === nextValue) {
    return prev;
  }

  if (prev == null || nextValue == null) {
    ref.current = nextValue;
    return nextValue;
  }

  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(nextValue);

  if (prevKeys.length !== nextKeys.length) {
    ref.current = nextValue;
    return nextValue;
  }

  for (const key of nextKeys) {
    if (prev[key] !== nextValue[key]) {
      ref.current = nextValue;
      return nextValue;
    }
  }

  return prev;
}
