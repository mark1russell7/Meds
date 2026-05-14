import { useCallback } from 'react';
import { Collection } from '@signaldb/core';
import maverickjsReactivityAdapter from '@signaldb/maverickjs';
import { SEED_MEDS } from '../seed';
import type { Med } from '../types';
import { createAsyncStorageAdapter } from './persistence/asyncStorageAdapter';
import { useReactivity } from './reactivity';

const STORAGE_KEY = '@meds/collection/meds';

export const medsCollection = new Collection<Med, string>({
  name: 'meds',
  reactivity: maverickjsReactivityAdapter,
  persistence: createAsyncStorageAdapter<Med>(STORAGE_KEY),
});

// -----------------------------------------------------------------------------
// Repository operations (module-level — for app lifecycle, seed, etc.)
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// useMedsRepository — consumer-facing hook. App code never touches the
// collection directly; it asks for behaviour. Lets us swap the persistence
// layer or mock for tests without changing call sites.
// -----------------------------------------------------------------------------

export type MedsRepository = {
  meds: Med[];
  setOffset: (id: string, offset: number) => void;
};

export function useMedsRepository(): MedsRepository {
  const meds = useReactivity(() => medsCollection.find().fetch(), []);

  const setOffset = useCallback((id: string, offset: number) => {
    medsCollection.updateOne({ id }, { $set: { offset } });
  }, []);

  return { meds, setOffset };
}
