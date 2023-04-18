import { Injector, Type, InjectionToken, InjectFlags } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export class RootInjector {
  private static rootInjector: Injector;
  private static readonly $injectorReady = new BehaviorSubject(false);
  readonly injectorReady$ = RootInjector.$injectorReady.asObservable();

  static setInjector(injector: Injector) {
    if (this.rootInjector) {
      return;
    }

    this.rootInjector = injector;
    this.$injectorReady.next(true);
  }

  static get<T>(
    token: Type<T> | InjectionToken<T>,
    notFoundValue?: T,
    flags?: InjectFlags
  ): T | null {
    try {
      return this.rootInjector.get(token, notFoundValue, flags);
    } catch (e) {
      console.error(
        `Error getting ${token} from RootInjector. This is likely due to RootInjector is undefined. Please check RootInjector.rootInjector value.`
      );
      return null;
    }
  }
}
