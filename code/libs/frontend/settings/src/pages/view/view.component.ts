import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'badman-view',
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss'],
})
export class ViewComponent implements OnInit {
  ngOnInit(): void {
    console.log('Hello');
  }
}
