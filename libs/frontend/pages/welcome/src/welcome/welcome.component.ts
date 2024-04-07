import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { UserComponent } from '@badman/frontend-components';

@Component({
  standalone: true,
  imports: [CommonModule, UserComponent],
  template: `
    <h1>Welcome to badman!</h1>

    <badman-test />
  `,
})
export class WelcomePageComponent {
  title = inject(Title);

  constructor() {
    this.title.setTitle('Welcome!');
  }
}
3;
