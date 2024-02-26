import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'badman-root',
  template: `<badman-shell>
    <router-outlet></router-outlet>
  </badman-shell>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
