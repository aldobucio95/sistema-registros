/** Large AppMain handlers (excel, logs-related tail, registry mutations, etc.). */
/* __EXTRACTED_APP_MAIN_HANDLERS__ */

import { useRef } from 'react';
import { useAppMainHandlersPartA } from './useAppMainHandlersPartA.jsx';
import { useAppMainHandlersPartB } from './useAppMainHandlersPartB.jsx';

export function useAppMainHandlers(getScope) {
  const bridgeRef = useRef({});
  const getScoped = () => ({ ...getScope(), ...bridgeRef.current });
  const partA = useAppMainHandlersPartA(getScoped);
  bridgeRef.current = partA;
  const partB = useAppMainHandlersPartB(getScoped);
  bridgeRef.current = { ...partA, ...partB };
  return { ...partA, ...partB };
}
