import { InjectionToken, ModuleWithProviders, NgModule } from '@angular/core';

export const JOBS_CONFIG_TOKEN =
  new InjectionToken<JobsConfiguration>('jobs.config');

export type JobsConfiguration = Readonly<{
  api: string;
}>;

@NgModule({
  imports: [],
})
export class JobsModule {
  static forRoot(config: JobsConfiguration): ModuleWithProviders<JobsModule> {
    return {
      ngModule: JobsModule,
      providers: [{ provide: JOBS_CONFIG_TOKEN, useValue: config }],
    };
  }
}
