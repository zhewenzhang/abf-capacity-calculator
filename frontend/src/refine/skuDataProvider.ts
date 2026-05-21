/**
 * Refine data provider for SKU CRUD.
 * Wraps existing skuService functions; does NOT duplicate Firestore paths.
 *
 * Scoped by userId + projectId via the closure.
 */

import type { DataProvider, GetListParams, GetOneParams, CreateParams, UpdateParams, DeleteOneParams } from '@refinedev/core';
import { getSKUs, getSKU, saveSKU, deleteSKU } from '../services/skuService';
import type { SKU } from '../types';

export function createSkuDataProvider(userId: string, projectId: string): DataProvider {
  const provider = {
    getList: async ({ pagination, sorters, filters }: GetListParams) => {
      const skus = await getSKUs(userId, projectId);

      // Apply filters
      let result = [...skus];
      filters?.forEach((filter) => {
        if ('field' in filter && filter.operator === 'eq' && filter.value) {
          result = result.filter((s) => (s as any)[filter.field] === filter.value);
        }
      });

      // Apply sorting
      sorters?.forEach(({ field, order }) => {
        result.sort((a, b) => {
          const aVal = (a as any)[field];
          const bVal = (b as any)[field];
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return order === 'asc' ? cmp : -cmp;
        });
      });

      // Apply pagination
      const current = (pagination as any)?.current ?? 1;
      const pageSize = (pagination as any)?.pageSize ?? 20;
      const start = (current - 1) * pageSize;
      const data = result.slice(start, start + pageSize);

      return {
        data,
        total: result.length,
      };
    },

    getOne: async ({ id }: GetOneParams) => {
      const sku = await getSKU(userId, projectId, id as string);
      if (!sku) throw new Error(`SKU not found: ${id}`);
      return { data: sku };
    },

    create: async ({ variables }: CreateParams<any>) => {
      const sku = variables as Omit<SKU, 'id'> & { id?: string };
      const id = await saveSKU(userId, projectId, sku);
      return { data: { ...sku, id } as unknown as SKU };
    },

    update: async ({ id, variables }: UpdateParams<any>) => {
      const sku = { ...(variables as any), id: id as string } as Omit<SKU, 'id'> & { id: string };
      await saveSKU(userId, projectId, sku);
      return { data: sku as unknown as SKU };
    },

    deleteOne: async ({ id }: DeleteOneParams<any>) => {
      await deleteSKU(userId, projectId, id as string);
      return { data: { id: id as string } as unknown as SKU };
    },

    getApiUrl: () => '',
  };

  return provider as unknown as DataProvider;
}
