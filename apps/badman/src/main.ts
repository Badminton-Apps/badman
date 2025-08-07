import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { provideAnimations } from "@angular/platform-browser/animations";
import { AppModule } from "./app/app.module";

function bootstrap() {
  platformBrowserDynamic()
    .bootstrapModule(AppModule, {
      // ngZone: 'noop',
      providers: [provideAnimations()],
    })
    .catch((err) => console.error(err));
}

if (document.readyState === "complete") {
  bootstrap();
} else {
  document.addEventListener("DOMContentLoaded", bootstrap);
}
