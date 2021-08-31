import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { TeamService } from 'app/_shared';
import * as moment from 'moment';
import { TeamAssemblyService } from '../../services/team-assembly.service';

@Component({
  templateUrl: './team-assembly.component.html',
  styleUrls: ['./team-assembly.component.scss'],
})
export class TeamAssemblyComponent {
  formGroup: FormGroup = new FormGroup({});
  constructor(private assemblyService: TeamAssemblyService) {}

  async download() {
    console.log('download', this.formGroup.value);
    const encounter = this.formGroup.get('encounter').value;

    const response = await this.assemblyService
      .getPdf({
        captainId: this.formGroup.get('captain').value?.id,
        teamId: this.formGroup.get('team').value?.id,
        encounterId: encounter?.id,
        team: {
          double: [
            this.formGroup.get('double1')?.value?.map((r) => r.id),
            this.formGroup.get('double2').value?.map((r) => r.id),
            this.formGroup.get('double3').value?.map((r) => r.id),
            this.formGroup.get('double4').value?.map((r) => r.id),
          ],
          single: [
            this.formGroup.get('single1').value?.id,
            this.formGroup.get('single2').value?.id,
            this.formGroup.get('single3').value?.id,
            this.formGroup.get('single4').value?.id,
          ],
          subtitude: this.formGroup.get('substitude').value?.map((r) => r.id) ?? [],
        },
      })
      .toPromise();

    // const blob = new Blob([response], { type: 'application/pdf' });
    var downloadURL = window.URL.createObjectURL(response);
    var link = document.createElement('a');
    link.href = downloadURL;
    link.download = `${moment(encounter?.date).format('YYYY-MM-DD HH:mm')} - ${encounter?.home?.name} vs ${encounter?.away?.name}.pdf`;
    link.click();
  }
}
