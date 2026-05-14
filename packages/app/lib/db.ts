import { Collection, createPersistenceAdapter } from '@signaldb/core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED_MEDS, type Med } from '../data';

const STORAGE_KEY = '@meds/collection/meds';

// SignalDB persistence adapter backed by AsyncStorage. The whole collection is
// serialized as a single JSON blob under one key, which is fine for our scale.
// Swap this for a SQLite or MMKV-backed adapter later without changing anything
// upstream.
function createAsyncStorageAdapter<T extends { id: string }>(key: string) {
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

export const medsCollection = new Collection<Med, string>({
  name: 'meds',
  persistence: createAsyncStorageAdapter<Med>(STORAGE_KEY),
});

export async function clearDB(): Promise<void> {
  await medsCollection.isReady();
  medsCollection.removeMany({});
}

export async function loadDB(): Promise<void> {
  await medsCollection.isReady();
  medsCollection.insertMany(SEED_MEDS);
}

export async function resetAndSeed(): Promise<void> {
  await medsCollection.isReady();
  medsCollection.batch(() => {
    medsCollection.removeMany({});
    medsCollection.insertMany(SEED_MEDS);
  });
}
