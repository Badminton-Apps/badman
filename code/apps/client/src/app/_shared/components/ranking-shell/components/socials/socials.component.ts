import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'badman-socials',
  templateUrl: './socials.component.html',
  styleUrls: ['./socials.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialsComponent {
  discord = 'https://discord.gg/dWMHrRrEgb';
  github = 'https://github.com/Badminton-Apps/badman';
}
