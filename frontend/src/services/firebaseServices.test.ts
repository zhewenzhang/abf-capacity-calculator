import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Forecast, ProjectParameters, SKU } from '../types';
import { personalScope, workspaceScope } from './projectScope';

const firestoreMock = vi.hoisted(() => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(),
  batchSet: vi.fn(),
  batchCommit: vi.fn(),
}));

vi.mock('../firebase/config', () => ({
  db: { kind: 'mock-db' },
  isConfigured: true,
}));

vi.mock('firebase/firestore', () => ({
  collection: firestoreMock.collection,
  doc: firestoreMock.doc,
  getDocs: firestoreMock.getDocs,
  getDoc: firestoreMock.getDoc,
  setDoc: firestoreMock.setDoc,
  deleteDoc: firestoreMock.deleteDoc,
  query: firestoreMock.query,
  orderBy: firestoreMock.orderBy,
  where: firestoreMock.where,
  writeBatch: firestoreMock.writeBatch,
}));

function snapshot(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    docs: docs.map((entry) => ({
      id: entry.id,
      data: () => entry.data,
    })),
  };
}

const sku: Omit<SKU, 'id'> = {
  skuCode: 'SKU-1',
  customer: 'Customer',
  deviceName: 'Device',
  osat: 'ASE',
  application: 'AI',
  productGrade: 'Auto',
  sizeCategory: 'medium',
  chipLengthMm: 10,
  chipWidthMm: 8,
  layerCount: 10,
  unitPrice: 2,
  unitPriceCurrency: 'USD',
};

const forecast: Omit<Forecast, 'id'> = {
  skuId: 'sku-1',
  month: '2026-01',
  forecastPcs: 1000,
  unitPrice: 2,
  unitPriceCurrency: 'USD',
};

const parameters: ProjectParameters = {
  yieldMatrix: {
    small: { '4-8L': 0.98, '10-14L': 0.96, '16-20L': 0.94, '20L+': 0.92 },
    medium: { '4-8L': 0.88, '10-14L': 0.86, '16-20L': 0.84, '20L+': 0.82 },
    large: { '4-8L': 0.82, '10-14L': 0.8, '16-20L': 0.78, '20L+': 0.76 },
    xlarge: { '4-8L': 0.75, '10-14L': 0.73, '16-20L': 0.71, '20L+': 0.69 },
  },
  panelParams: {
    panelLengthMm: 244.1,
    panelWidthMm: 246.2,
    marginLengthMm: 10,
    marginWidthMm: 5.3,
    toleranceMm: 0,
  },
  defaultWorkingDays: 28,
  bpTargets: {
    mode: 'yearly',
    yearlyRevenueTargetsMillionTwd: { '2026': 320 },
  },
};

describe('Firebase service layer with mocked Firestore', () => {
  const personalProjectScope = personalScope('user-1', 'project-1');
  const sharedWorkspaceScope = workspaceScope('user-1', 'ws-42', 'editor', 'project-1');
  const viewerScope = workspaceScope('user-1', 'ws-42', 'viewer', 'project-1');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'generated-id') });
    firestoreMock.collection.mockImplementation((_db, path: string) => ({ type: 'collection', path }));
    firestoreMock.doc.mockImplementation((dbOrCollection: { path?: string }, pathOrId: string, maybeId?: string) => {
      const path = maybeId
        ? (dbOrCollection.path ? `${dbOrCollection.path}/${pathOrId}/${maybeId}` : `${pathOrId}/${maybeId}`)
        : pathOrId;
      return {
        type: 'doc',
        path,
        id: maybeId ?? pathOrId.split('/').at(-1),
      };
    });
    firestoreMock.orderBy.mockImplementation((field: string, direction: string) => ({ type: 'orderBy', field, direction }));
    firestoreMock.where.mockImplementation((field: string, op: string, value: unknown) => ({ type: 'where', field, op, value }));
    firestoreMock.query.mockImplementation((collectionRef, ...constraints) => ({ type: 'query', collectionRef, constraints }));
    firestoreMock.writeBatch.mockReturnValue({
      set: firestoreMock.batchSet,
      commit: firestoreMock.batchCommit,
    });
    firestoreMock.batchCommit.mockResolvedValue(undefined);
    firestoreMock.setDoc.mockResolvedValue(undefined);
    firestoreMock.deleteDoc.mockResolvedValue(undefined);
  });

  it('skuService routes personal scope to users/{uid}/projects path', async () => {
    const { getSKUs, saveSKU, deleteSKU } = await import('./skuService');
    firestoreMock.getDocs.mockResolvedValue(snapshot([{ id: 'sku-1', data: sku }]));

    const rows = await getSKUs(personalProjectScope);
    const savedId = await saveSKU(personalProjectScope, sku);
    await deleteSKU(personalProjectScope, 'sku-1');

    expect(rows).toEqual([{ id: 'sku-1', ...sku }]);
    expect(firestoreMock.collection).toHaveBeenCalledWith({ kind: 'mock-db' }, 'users/user-1/projects/project-1/skus');
    expect(savedId).toBe('generated-id');
    expect(firestoreMock.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/projects/project-1/skus/generated-id' }),
      expect.objectContaining({ id: 'generated-id', skuCode: 'SKU-1', createdAt: expect.any(Date), updatedAt: expect.any(Date) })
    );
    expect(firestoreMock.deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/user-1/projects/project-1/skus/sku-1' }));
  });

  it('skuService routes workspace scope to workspaces/{wid}/projects path', async () => {
    const { getSKUs, saveSKU } = await import('./skuService');
    firestoreMock.getDocs.mockResolvedValue(snapshot([{ id: 'sku-1', data: sku }]));

    await getSKUs(sharedWorkspaceScope);
    await saveSKU(sharedWorkspaceScope, sku);

    expect(firestoreMock.collection).toHaveBeenCalledWith({ kind: 'mock-db' }, 'workspaces/ws-42/projects/project-1/skus');
    expect(firestoreMock.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'workspaces/ws-42/projects/project-1/skus/generated-id' }),
      expect.objectContaining({ id: 'generated-id', skuCode: 'SKU-1' })
    );
  });

  it('skuService rejects writes when scope role is viewer', async () => {
    const { saveSKU, deleteSKU, batchSaveSKUs } = await import('./skuService');
    await expect(saveSKU(viewerScope, sku)).rejects.toThrow(/viewer/);
    await expect(deleteSKU(viewerScope, 'sku-1')).rejects.toThrow(/viewer/);
    await expect(batchSaveSKUs(viewerScope, [sku])).rejects.toThrow(/viewer/);
    // Read still allowed for viewers (no throw).
    firestoreMock.getDocs.mockResolvedValue(snapshot([]));
    const { getSKUs } = await import('./skuService');
    await expect(getSKUs(viewerScope)).resolves.toEqual([]);
  });

  it('forecastService routes scope to forecasts path with month ordering', async () => {
    const { getForecasts, getForecastsBySku } = await import('./forecastService');
    firestoreMock.getDocs.mockResolvedValue(snapshot([{ id: 'fc-1', data: forecast }]));

    const personalRows = await getForecasts(personalProjectScope);
    const workspaceRows = await getForecasts(sharedWorkspaceScope);
    const skuRows = await getForecastsBySku(personalProjectScope, 'sku-1');

    expect(personalRows).toEqual([{ id: 'fc-1', ...forecast }]);
    expect(workspaceRows).toEqual([{ id: 'fc-1', ...forecast }]);
    expect(skuRows).toEqual([{ id: 'fc-1', ...forecast }]);
    expect(firestoreMock.collection).toHaveBeenCalledWith({ kind: 'mock-db' }, 'users/user-1/projects/project-1/forecasts');
    expect(firestoreMock.collection).toHaveBeenCalledWith({ kind: 'mock-db' }, 'workspaces/ws-42/projects/project-1/forecasts');
    expect(firestoreMock.orderBy).toHaveBeenCalledWith('month', 'asc');
    expect(firestoreMock.where).toHaveBeenCalledWith('skuId', '==', 'sku-1');
  });

  it('forecastService write helpers respect viewer role', async () => {
    const { saveForecast, batchSaveForecasts, deleteForecast } = await import('./forecastService');
    await expect(saveForecast(viewerScope, forecast)).rejects.toThrow(/viewer/);
    await expect(batchSaveForecasts(viewerScope, [forecast])).rejects.toThrow(/viewer/);
    await expect(deleteForecast(viewerScope, 'fc-1')).rejects.toThrow(/viewer/);
  });

  it('forecastService writes succeed for editor scope', async () => {
    const { saveForecast, batchSaveForecasts, deleteForecast } = await import('./forecastService');

    const savedId = await saveForecast(sharedWorkspaceScope, forecast);
    await batchSaveForecasts(sharedWorkspaceScope, [forecast, { ...forecast, id: 'fc-2' }]);
    await deleteForecast(sharedWorkspaceScope, 'fc-1');

    expect(savedId).toBe('generated-id');
    expect(firestoreMock.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'workspaces/ws-42/projects/project-1/forecasts/generated-id' }),
      expect.objectContaining({ id: 'generated-id', forecastPcs: 1000 })
    );
    expect(firestoreMock.deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'workspaces/ws-42/projects/project-1/forecasts/fc-1' }));
  });

  it('parameterService returns saved parameters when document exists', async () => {
    const { getParameters } = await import('./parameterService');
    firestoreMock.getDoc.mockResolvedValue({ exists: () => true, data: () => parameters });

    const result = await getParameters(personalProjectScope);
    expect(result.bpTargets?.yearlyRevenueTargetsMillionTwd).toEqual({ '2026': 320 });
    expect(firestoreMock.doc).toHaveBeenCalledWith({ kind: 'mock-db' }, 'users/user-1/projects/project-1/parameters/default');
  });

  it('parameterService returns safe defaults when parameter document does not exist', async () => {
    const { getParameters } = await import('./parameterService');
    firestoreMock.getDoc.mockResolvedValue({ exists: () => false });

    const result = await getParameters(personalProjectScope);
    expect(result.defaultWorkingDays).toBe(28);
    expect(result.yieldMatrix.medium['10-14L']).toBe(0.86);
    expect(result.panelParams.panelLengthMm).toBe(244.1);
    expect(result.bpTargets).toBeUndefined();
  });

  it('parameterService.saveParameters writes to workspace path for workspace scope', async () => {
    const { saveParameters } = await import('./parameterService');
    await saveParameters(sharedWorkspaceScope, parameters);

    expect(firestoreMock.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'workspaces/ws-42/projects/project-1/parameters/default' }),
      expect.objectContaining({
        bpTargets: { mode: 'yearly', yearlyRevenueTargetsMillionTwd: { '2026': 320 } },
        updatedAt: expect.any(Date),
      })
    );
  });

  it('parameterService.saveParameters rejects viewer', async () => {
    const { saveParameters } = await import('./parameterService');
    await expect(saveParameters(viewerScope, parameters)).rejects.toThrow(/viewer/);
  });

  it('capacityService getCapacityPlans uses the resolved scope path', async () => {
    const { getCapacityPlans } = await import('./capacityService');
    firestoreMock.getDocs.mockResolvedValue(snapshot([]));
    await getCapacityPlans(sharedWorkspaceScope);
    expect(firestoreMock.collection).toHaveBeenCalledWith({ kind: 'mock-db' }, 'workspaces/ws-42/projects/project-1/capacityPlans');
  });
});
