import { Injectable } from '@angular/core';
import * as html2pdf from 'html2pdf.js';

@Injectable({
  providedIn: 'root',
})
export class PdfService {
  constructor() {}

  public async generatePdf(data: any, filename: string) {
    html2pdf()
      .from(data)
      .set({
        margin: 3,
        filename,

        html2canvas: { logging: false, scale: 2 },
        jsPDF: { orientation: 'landscape', format: 'a4', unit: 'mm' },
      })
      .save();
  }
}
