import { createTrpcClient } from '@analogjs/trpc';
import { inject } from '@angular/core';
import { AppRouter } from './server/trpc/routers';

export const { provideTrpcClient, TrpcClient } = createTrpcClient<AppRouter>({
  url: 'http://localhost:4200/api/trpc',
});

export function injectTrpcClient() {
  return inject(TrpcClient);
}
