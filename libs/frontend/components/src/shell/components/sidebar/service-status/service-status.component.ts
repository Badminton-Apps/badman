
import { Component, inject } from '@angular/core';
import { ServiceService } from './service-status.service';

@Component({
    selector: 'badman-service-status',
    templateUrl: './service-status.component.html',
    styleUrls: ['./service-status.component.scss'],
    imports: []
})
export class ServiceStatusComponent {
  state = inject(ServiceService);
}
