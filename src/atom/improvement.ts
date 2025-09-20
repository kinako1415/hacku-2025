import { atomWithStorage } from 'jotai/utils';

export const rightHandImprovementRateAtom = atomWithStorage<number>('rightHandImprovementRate', 0);
export const leftHandImprovementRateAtom = atomWithStorage<number>('leftHandImprovementRate', 0);
