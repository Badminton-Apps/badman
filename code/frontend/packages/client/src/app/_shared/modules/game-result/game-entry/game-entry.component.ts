import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-game-entry',
  templateUrl: './game-entry.component.html',
  styleUrls: ['./game-entry.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameEntryComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
