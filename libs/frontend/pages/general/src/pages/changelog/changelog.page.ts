import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';

@Component({
  templateUrl: './changelog.page.html',
  styleUrls: ['./changelog.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MarkdownModule
],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangelogPageComponent {}
