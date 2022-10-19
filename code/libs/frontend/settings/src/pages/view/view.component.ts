import { Component, OnInit } from '@angular/core';
import { Player } from '@badman/frontend-models';

@Component({
  selector: 'badman-view',
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss'],
})
export class ViewComponent implements OnInit {
  ngOnInit(): void {
    const test = new Player();
    console.log('Hello');
  }
}
