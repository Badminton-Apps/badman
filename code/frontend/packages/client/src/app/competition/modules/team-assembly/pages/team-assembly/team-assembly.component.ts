import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Player, TeamService } from 'app/_shared';
import * as moment from 'moment';
import { lastValueFrom } from 'rxjs';
import { TeamAssemblyService } from '../../services/team-assembly.service';

@Component({
  templateUrl: './team-assembly.component.html',
  styleUrls: ['./team-assembly.component.scss'],
})
export class TeamAssemblyComponent {
  formGroup: FormGroup = new FormGroup({});
  constructor(private assemblyService: TeamAssemblyService) {}

  async download() {
    const encounter = this.formGroup.get('encounter')?.value;

    const response = await lastValueFrom(
      this.assemblyService.getPdf({
        captainId: this.formGroup.get('captain')?.value?.id,
        teamId: this.formGroup.get('team')?.value?.id,
        encounterId: encounter?.id,
        team: {
          double: [
            this.formGroup.get('double1')?.value?.map((r: Player) => r.id),
            this.formGroup.get('double2')?.value?.map((r: Player) => r.id),
            this.formGroup.get('double3')?.value?.map((r: Player) => r.id),
            this.formGroup.get('double4')?.value?.map((r: Player) => r.id),
          ],
          single: [
            this.formGroup.get('single1')?.value?.id,
            this.formGroup.get('single2')?.value?.id,
            this.formGroup.get('single3')?.value?.id,
            this.formGroup.get('single4')?.value?.id,
          ],
          subtitude: this.formGroup.get('substitude')?.value?.map((r: Player) => r?.id) ?? [],
        },
      })
    );

    // const blob = new Blob([response], { type: 'application/pdf' });
    var downloadURL = window.URL.createObjectURL(response);
    var link = document.createElement('a');
    link.href = downloadURL;
    link.download = `${moment(encounter?.date).format('YYYY-MM-DD HH:mm')} - ${encounter?.home?.name} vs ${
      encounter?.away?.name
    }.pdf`;
    link.click();
  }
}
