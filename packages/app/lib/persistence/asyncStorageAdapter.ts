import { createPersistenceAdapter } from '@signaldb/core';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Generic SignalDB persistence adapter backed by AsyncStorage. The whole
 * collection is serialized as a single JSON blob under one key. Fine for
 * collections up to hundreds of small docs; for larger or write-heavy data,
 * swap for SQLite / MMKV at the call site without changing anything upstream.
 *
 * Cross-platform: @react-native-async-storage/async-storage falls back to
 * localStorage on web, so this adapter works in RN, iOS, Android and web.
 */
export function createAsyncStorageAdapter<T extends { id: string }>(
  key: string,
) {
  return createPersistenceAdapter<T, string>({
    register: async () => {
      // AsyncStorage is owned exclusively by this adapter, so there's no
      // external change source to listen for.
    },
    load: async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        const items = raw ? (JSON.parse(raw) as T[]) : [];
        return { items };
      } catch {
        return { items: [] };
      }
    },
    save: async (items) => {
      try {
        await AsyncStorage.setItem(key, JSON.stringify(items));
      } catch {}
    },
  });
}
