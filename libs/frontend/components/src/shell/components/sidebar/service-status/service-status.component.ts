import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ServiceService } from './service-status.service';

@Component({
  selector: 'badman-service-status',
  templateUrl: './service-status.component.html',
  styleUrls: ['./service-status.component.scss'],
  standalone: true,
  imports: [
    CommonModule
],
})
export class ServiceStatusComponent  {
  state = inject(ServiceService);
}
