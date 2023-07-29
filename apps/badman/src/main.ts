import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { provideAnimations } from '@angular/platform-browser/animations';


function bootstrap() {
  platformBrowserDynamic()
    .bootstrapModule(AppModule, {
      providers: [provideAnimations()],
    })
    .catch((err) => console.error(err));
}

if (document.readyState === 'complete') {
  bootstrap();
} else {
  document.addEventListener('DOMContentLoaded', bootstrap);
}
