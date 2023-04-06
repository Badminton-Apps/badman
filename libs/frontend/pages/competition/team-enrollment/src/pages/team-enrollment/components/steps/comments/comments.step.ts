import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'badman-comments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comments.step.html',
  styleUrls: ['./comments.step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentsStepComponent {}
