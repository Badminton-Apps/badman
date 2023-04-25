import { Component } from '@angular/core';
import { ChildrenOutletContexts } from '@angular/router';
import { slideInAnimation } from './app.animations';

@Component({
  selector: 'badman-root',
  template: `<badman-shell>
    <div [@routerTransition]="getRouteAnimationData()">
      <router-outlet></router-outlet>
    </div>
  </badman-shell>`,
  animations: [slideInAnimation],
})
export class AppComponent {
  constructor(private contexts: ChildrenOutletContexts) {}

  getRouteAnimationData() {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.[
      'animation'
    ];
  }
}
