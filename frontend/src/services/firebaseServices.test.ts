import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Forecast, ProjectParameters, SKU } from '../types';

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
};

const forecast: Omit<Forecast, 'id'> = {
  skuId: 'sku-1',
  month: '2026-01',
  forecastPcs: 1000,
  unitPrice: 2,
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

  it('skuService reads SKUs ordered by createdAt and saves generated IDs to the user project path', async () => {
    const { getSKUs, saveSKU, deleteSKU } = await import('./skuService');
    firestoreMock.getDocs.mockResolvedValue(snapshot([{ id: 'sku-1', data: sku }]));

    const rows = await getSKUs('user-1', 'project-1');
    const savedId = await saveSKU('user-1', 'project-1', sku);
    await deleteSKU('user-1', 'project-1', 'sku-1');

    expect(rows).toEqual([{ id: 'sku-1', ...sku }]);
    expect(firestoreMock.collection).toHaveBeenCalledWith({ kind: 'mock-db' }, 'users/user-1/projects/project-1/skus');
    expect(firestoreMock.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(savedId).toBe('generated-id');
    expect(firestoreMock.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/projects/project-1/skus/generated-id' }),
      expect.objectContaining({ id: 'generated-id', skuCode: 'SKU-1', createdAt: expect.any(Date), updatedAt: expect.any(Date) })
    );
    expect(firestoreMock.deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/user-1/projects/project-1/skus/sku-1' }));
  });

  it('skuService batchSaveSKUs commits all writes without real Firestore', async () => {
    const { batchSaveSKUs } = await import('./skuService');

    const ids = await batchSaveSKUs('user-1', 'project-1', [sku, { ...sku, id: 'existing-sku' }]);

    expect(ids).toEqual(['generated-id', 'existing-sku']);
    expect(firestoreMock.writeBatch).toHaveBeenCalledWith({ kind: 'mock-db' });
    expect(firestoreMock.batchSet).toHaveBeenCalledTimes(2);
    expect(firestoreMock.batchSet).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/projects/project-1/skus/existing-sku' }),
      expect.objectContaining({ id: 'existing-sku', updatedAt: expect.any(Date) })
    );
    expect(firestoreMock.batchCommit).toHaveBeenCalledTimes(1);
  });

  it('forecastService reads all forecasts and SKU-filtered forecasts with month ordering', async () => {
    const { getForecasts, getForecastsBySku } = await import('./forecastService');
    firestoreMock.getDocs.mockResolvedValue(snapshot([{ id: 'fc-1', data: forecast }]));

    const allRows = await getForecasts('user-1', 'project-1');
    const skuRows = await getForecastsBySku('user-1', 'project-1', 'sku-1');

    expect(allRows).toEqual([{ id: 'fc-1', ...forecast }]);
    expect(skuRows).toEqual([{ id: 'fc-1', ...forecast }]);
    expect(firestoreMock.collection).toHaveBeenCalledWith({ kind: 'mock-db' }, 'users/user-1/projects/project-1/forecasts');
    expect(firestoreMock.orderBy).toHaveBeenCalledWith('month', 'asc');
    expect(firestoreMock.where).toHaveBeenCalledWith('skuId', '==', 'sku-1');
  });

  it('forecastService save, batch save, and delete use forecast paths and generated IDs', async () => {
    const { saveForecast, batchSaveForecasts, deleteForecast } = await import('./forecastService');

    const savedId = await saveForecast('user-1', 'project-1', forecast);
    await batchSaveForecasts('user-1', 'project-1', [forecast, { ...forecast, id: 'fc-2' }]);
    await deleteForecast('user-1', 'project-1', 'fc-1');

    expect(savedId).toBe('generated-id');
    expect(firestoreMock.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/projects/project-1/forecasts/generated-id' }),
      expect.objectContaining({ id: 'generated-id', forecastPcs: 1000, updatedAt: expect.any(Date) })
    );
    expect(firestoreMock.batchSet).toHaveBeenCalledTimes(2);
    expect(firestoreMock.batchCommit).toHaveBeenCalledTimes(1);
    expect(firestoreMock.deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/user-1/projects/project-1/forecasts/fc-1' }));
  });

  it('parameterService returns saved parameters including BP targets when document exists', async () => {
    const { getParameters } = await import('./parameterService');
    firestoreMock.getDoc.mockResolvedValue({ exists: () => true, data: () => parameters });

    const result = await getParameters('user-1', 'project-1');

    expect(result.bpTargets?.yearlyRevenueTargetsMillionTwd).toEqual({ '2026': 320 });
    expect(firestoreMock.doc).toHaveBeenCalledWith({ kind: 'mock-db' }, 'users/user-1/projects/project-1/parameters/default');
  });

  it('parameterService returns safe defaults when parameter document does not exist', async () => {
    const { getParameters } = await import('./parameterService');
    firestoreMock.getDoc.mockResolvedValue({ exists: () => false });

    const result = await getParameters('user-1', 'project-1');

    expect(result.defaultWorkingDays).toBe(28);
    expect(result.yieldMatrix.medium['10-14L']).toBe(0.86);
    expect(result.panelParams.panelLengthMm).toBe(244.1);
    expect(result.bpTargets).toBeUndefined();
  });

  it('parameterService saves BP target settings with updatedAt timestamp', async () => {
    const { saveParameters } = await import('./parameterService');

    await saveParameters('user-1', 'project-1', parameters);

    expect(firestoreMock.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/user-1/projects/project-1/parameters/default' }),
      expect.objectContaining({
        bpTargets: { mode: 'yearly', yearlyRevenueTargetsMillionTwd: { '2026': 320 } },
        updatedAt: expect.any(Date),
      })
    );
  });
});
