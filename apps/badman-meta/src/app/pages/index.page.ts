import { Component, computed, signal } from '@angular/core';
import { RouteMeta } from '@analogjs/router';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterOutlet],
  template: ` <h2>Hello Analog!</h2> `,
})
export default class LandingPageComponent {}
