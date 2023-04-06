import { InjectionToken, ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IPdfConfig } from './interfaces';

export const PDF_CONFIG = new InjectionToken<IPdfConfig>('PDF_CONFIG');

@NgModule({
  imports: [CommonModule],
})
export class PdfModule {
  public static forRoot(config: IPdfConfig): ModuleWithProviders<PdfModule> {
    return {
      ngModule: PdfModule,
      providers: [{ provide: PDF_CONFIG, useValue: config }],
    };
  }
}
