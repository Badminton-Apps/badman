import { ChangeDetectionStrategy, Component } from '@angular/core';
import { otherAnimation } from './app.animations';

@Component({
  selector: 'badman-root',
  template: `<badman-shell>
    <router-outlet></router-outlet>
  </badman-shell>`,
  animations: [otherAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
