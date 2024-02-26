import { InjectionToken } from '@angular/core';

export const VERSION_INFO = new InjectionToken<{
  beta: boolean;
  version: string;
}>('version.config');
