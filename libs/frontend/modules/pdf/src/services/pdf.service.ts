import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { IPdfConfig } from '../interfaces';
import { PDF_CONFIG } from '../pdf.module';
@Injectable({
  providedIn: 'root',
})
export class PdfService {
  constructor(
    private httpClient: HttpClient,
    @Inject(PDF_CONFIG)
    private config: IPdfConfig
  ) {}

  getTeamAssembly(input: {
    systemId: string;
    captainId: string;
    teamId: string;
    encounterId: string;

    single1?: string;
    single2?: string;
    single3?: string;
    single4?: string;

    double1?: string[];
    double2?: string[];
    double3?: string[];
    double4?: string[];

    subtitudes: string[];
  }) {
    return this.httpClient.post(`${this.config.api}/assembly/team`, input, {
      responseType: 'blob',
    });
  }
}
