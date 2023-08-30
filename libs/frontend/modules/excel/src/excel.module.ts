import { InjectionToken, ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IExcelConfig } from './interfaces';

export const EXCEL_CONFIG = new InjectionToken<IExcelConfig>('EXCEL_CONFIG');

@NgModule({
  imports: [CommonModule],
})
export class ExcelModule {
  public static forRoot(config: IExcelConfig): ModuleWithProviders<ExcelModule> {
    return {
      ngModule: ExcelModule,
      providers: [{ provide: EXCEL_CONFIG, useValue: config }],
    };
  }
}
