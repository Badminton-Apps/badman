import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from '@badman/frontend-components';

@Component({
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavigationComponent],
  template: ` <badman-navigation>
    <router-outlet #outlet="outlet"></router-outlet>
  </badman-navigation>`,
})
export class AppComponent {}
