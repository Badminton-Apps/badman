import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { TeamService } from 'app/_shared';

@Component({
  templateUrl: './team-assembly.component.html',
  styleUrls: ['./team-assembly.component.scss'],
})
export class TeamAssemblyComponent implements OnInit {
  formGroup: FormGroup = new FormGroup({});
  constructor(
  ) {}

  ngOnInit(): void {
  
  }
}
