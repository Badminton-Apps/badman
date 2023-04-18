import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { RootInjector } from '@badman/frontend-utils';

import { AppModule } from './app/app.module';

function bootstrap() {
  platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .then((ngModuleRef) => {
    RootInjector.setInjector(ngModuleRef.injector);
  })
  .catch((err) => console.error(err));
};


 if (document.readyState === 'complete') {
   bootstrap();
 } else {
   document.addEventListener('DOMContentLoaded', bootstrap);
 }
 
