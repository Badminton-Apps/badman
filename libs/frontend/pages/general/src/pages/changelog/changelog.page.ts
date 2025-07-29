
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';

@Component({
    templateUrl: './changelog.page.html',
    styleUrls: ['./changelog.page.scss'],
    imports: [RouterModule, MarkdownModule],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChangelogPageComponent {}
