import { effect } from '@maverick-js/signals';
import { createUseReactivityHook } from '@signaldb/react';

// The single React hook that subscribes a component to a SignalDB cursor. Pass
// it a function returning a reactive expression (e.g. `collection.find().fetch()`)
// and the component re-renders only when the *result* of that expression
// actually changes — not on every collection event.
export const useReactivity = createUseReactivityHook(effect);
