import React from 'react';
import { Refine } from '@refinedev/core';
import { createSkuDataProvider } from '../refine/skuDataProvider';

interface RefineProductsProps {
  userId: string;
  projectId: string;
  children: React.ReactNode;
}

/**
 * Wraps a page with a Refine provider scoped to userId/projectId.
 * The data provider is created per-user, per-project and shared via Refine context.
 */
export const RefineProductsProvider: React.FC<RefineProductsProps> = ({
  userId,
  projectId,
  children,
}) => {
  const dataProvider = React.useMemo(
    () => createSkuDataProvider(userId, projectId),
    [userId, projectId]
  );

  // Stub router provider - we manage routing through React Router externally
  // The go property must be a factory function that returns the actual go function
  const goFn = React.useCallback(() => {
    return () => { /* no-op */ };
  }, []);

  const routerProvider = React.useMemo(() => ({
    go: goFn,
    parsePath: () => ({ pathname: '/' }),
  }), [goFn]);

  return (
    <Refine
      dataProvider={dataProvider}
      routerProvider={routerProvider}
      options={{
        syncWithLocation: false,
        warnWhenUnsavedChanges: false,
      }}
    >
      {children}
    </Refine>
  );
};

export default RefineProductsProvider;
