import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwUpdate } from '@angular/service-worker';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(
    updates: SwUpdate,
    snackBar: MatSnackBar,
    translate: TranslateService
  ) {
    updates.available.subscribe((event) => {
      updates.activateUpdate().then(() => {
        snackBar
          .open('New version available', 'refresh')
          .onAction()
          .subscribe(() => {
            document.location.reload();
          });
      });
    });
  }
}
