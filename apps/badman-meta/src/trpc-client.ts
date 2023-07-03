import { createTrpcClient } from '@analogjs/trpc';
import { inject } from '@angular/core';
import { AppRouter } from './server/trpc/routers';

export const { provideTrpcClient, TrpcClient } = createTrpcClient<AppRouter>({
  url: import.meta.env.PROD
    ? 'https://badman-meta.vercel.app/services/trpc'
    : 'http://localhost:4200/services/trpc',
});

export function injectTrpcClient() {
  return inject(TrpcClient);
}
