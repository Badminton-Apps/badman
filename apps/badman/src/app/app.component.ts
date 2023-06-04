import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ChildrenOutletContexts } from '@angular/router';
import { otherAnimation } from './app.animations';

@Component({
  selector: 'badman-root',
  template: `<badman-shell>
    <main [@routerTransition]="getRouteAnimationData()">
      <router-outlet></router-outlet>
    </main>
  </badman-shell>`,
  animations: [otherAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  loading = false;

  constructor(private contexts: ChildrenOutletContexts) {}

  getRouteAnimationData() {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.[
      'animation'
    ];
  }
}
 