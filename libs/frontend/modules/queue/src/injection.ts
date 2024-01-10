import { InjectionToken } from '@angular/core';
import { JobsConfiguration } from '../../../modules/queue/src/interfaces/job-config.interface';

export const JOBS_CONFIG_TOKEN = new InjectionToken<JobsConfiguration>(
  'jobs.config',
);
