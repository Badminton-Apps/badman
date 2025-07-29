import { ChangeDetectionStrategy, Component } from '@angular/core';


@Component({
    selector: 'badman-logo',
    imports: [],
    templateUrl: './logo.component.html',
    styleUrls: ['./logo.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogoComponent {}
