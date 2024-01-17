import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ClaimComponent } from '@badman/frontend-components';
import { Claim, Role } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'badman-role-fields',
  templateUrl: './role-fields.component.html',
  styleUrls: ['./role-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    ClaimComponent,
  ],
})
export class RoleFieldsComponent implements OnInit {
  @Input()
  role: Role = {} as Role;

  @Input()
  claims!: { category: string; claims: Claim[] }[];

  @Output() save = new EventEmitter<Role>();

  roleForm!: FormGroup;

  selectedClaims: Claim[] = [];

  ngOnInit() {
    const nameControl = new FormControl(this.role.name, Validators.required);

    this.roleForm = new FormGroup({
      name: nameControl,
    });

    for (const claim of this.claims) {
      this.selectedClaims.push(...claim.claims.filter((c) => this.role.claims?.some((rc) => rc.name === c.name)));
    }
  }

  claimChanged(claim: Claim, checked: boolean) {
    if (checked) {
      this.selectedClaims.push(claim);
    } else {
      this.selectedClaims.splice(this.selectedClaims.indexOf(claim), 1);
    }
  }

  update() {
    if (this.roleForm.valid) {
      this.save.next({
        id: this.role.id,
        ...this.roleForm.value,
        claims: this.selectedClaims.map((c) => {
          return {
            id: c.id,
          };
        }),
      });
    }
  }
}
