import { Component, computed, signal } from '@angular/core';
import { RouteMeta } from '@analogjs/router';

export const routeMeta: RouteMeta = {
  title: 'About Analog',
};

@Component({
  selector: 'app-about',
  standalone: true,
  template: `
    <h2>Hello Analog!</h2>
    <p>Counter: {{ counter() }}</p>
    <p>Double: {{ double() }}</p>

    <button type="button" (click)="increment()">Increment</button>
    <button type="button" (click)="decrement()">Decrement</button>
  `,
})
export default class AboutPageComponent {
  counter = signal(0);
  double = computed(() => this.counter() * 2);

  increment() {
    this.counter.update((count) => count + 1);
  }

  decrement() {
    this.counter.update((count) => count - 1);
  }
}
