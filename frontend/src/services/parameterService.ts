import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { DEFAULT_WORKING_DAYS } from '../core/defaults';
import { normalizeCurrencySettings } from '../core/currency';
import type { ProjectParameters, YieldMatrix, PanelParams, ProjectScope } from '../types';
import { parametersDocPath, assertCanWrite } from './projectScope';

if (!db) {
  throw new Error('Firestore not initialized. Check your .env configuration.');
}

// Default yield matrix
const DEFAULT_YIELD: YieldMatrix = {
  small: { '4-8L': 0.98, '10-14L': 0.96, '16-20L': 0.94, '20L+': 0.92 },
  medium: { '4-8L': 0.88, '10-14L': 0.86, '16-20L': 0.84, '20L+': 0.82 },
  large: { '4-8L': 0.82, '10-14L': 0.80, '16-20L': 0.78, '20L+': 0.76 },
  xlarge: { '4-8L': 0.75, '10-14L': 0.73, '16-20L': 0.71, '20L+': 0.69 },
};

const DEFAULT_PANEL: PanelParams = {
  panelLengthMm: 244.1,
  panelWidthMm: 246.2,
  marginLengthMm: 10,
  marginWidthMm: 5.3,
  toleranceMm: 0,
};

function normalizeParameters(params: ProjectParameters): ProjectParameters {
  return {
    ...params,
    currencySettings: normalizeCurrencySettings(params.currencySettings),
  };
}

export async function getParameters(scope: ProjectScope): Promise<ProjectParameters> {
  const ref = doc(db!, parametersDocPath(scope));
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return normalizeParameters(snap.data() as ProjectParameters);
  }
  return normalizeParameters({
    yieldMatrix: DEFAULT_YIELD,
    panelParams: DEFAULT_PANEL,
    defaultWorkingDays: DEFAULT_WORKING_DAYS,
  });
}

export async function saveParameters(scope: ProjectScope, params: ProjectParameters): Promise<void> {
  assertCanWrite(scope);
  const ref = doc(db!, parametersDocPath(scope));
  await setDoc(ref, { ...params, updatedAt: new Date() });
}
