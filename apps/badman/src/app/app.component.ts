import { Component } from '@angular/core';

@Component({
  selector: 'badman-root',
  template: `<badman-shell>
    <router-outlet></router-outlet>
  </badman-shell>`,
})
export class AppComponent {}
