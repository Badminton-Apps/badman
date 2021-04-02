import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-assembly',
  templateUrl: './assembly.component.html',
  styleUrls: ['./assembly.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssemblyComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
