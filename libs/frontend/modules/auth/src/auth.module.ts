import { ModuleWithProviders, NgModule } from '@angular/core';
import {
  AuthConfig,
  AuthConfigService,
  AuthModule as auth0Module,
} from '@auth0/auth0-angular';

export type AuthConfiguration = Readonly<AuthConfig | undefined>;

@NgModule({
  imports: [auth0Module.forRoot()],
})
export class AuthModule {
  static forRoot(config?: AuthConfiguration): ModuleWithProviders<AuthModule> {
    return {
      ngModule: AuthModule,
      providers: [
        { provide: AuthConfigService, useValue: config },
        // Cannot be used when doing SSR
      ],
    };
  }
}
