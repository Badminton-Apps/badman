import { CommonModule } from '@angular/common';
import { Component, inject, input, TemplateRef, ViewChild, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Apollo, gql } from 'apollo-angular';
import { iif, of, switchMap } from 'rxjs';

@Component({
  selector: 'badman-add-role',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatInputModule],
  templateUrl: './add-role.component.html',
  styleUrls: ['./add-role.component.scss'],
})
export class AddRoleComponent {
  private apollo = inject(Apollo);
  private dialog = inject(MatDialog);

  linkId = input.required<string>();

  linkType = input.required<string>();

  @ViewChild('newRoleTemplate')
  newRoleTemplateRef?: TemplateRef<HTMLElement>;

  whenRoleAdded = output();

  async addRole() {
    if (!this.newRoleTemplateRef) {
      throw new Error('No newRoleTemplateRef');
    }

    this.dialog
      .open(this.newRoleTemplateRef)
      .afterClosed()
      .pipe(
        switchMap((result) =>
          iif(
            () => !!result,
            this.apollo.mutate({
              mutation: gql`
                mutation Mutation($data: RoleNewInput!) {
                  createRole(data: $data) {
                    id
                  }
                }
              `,
              variables: {
                data: {
                  name: result,
                  linkType: this.linkType(),
                  linkId: this.linkId(),
                  claims: [],
                },
              },
            }),
            of(null),
          ),
        ),
      )
      .subscribe(() => {
        this.whenRoleAdded.emit();
      });
  }
}
