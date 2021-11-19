import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnInit,
  Input,
  Output,
} from '@angular/core';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { Claim, Club, Role } from 'app/_shared';

@Component({
  selector: 'app-role-fields',
  templateUrl: './role-fields.component.html',
  styleUrls: ['./role-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleFieldsComponent implements OnInit {
  @Input()
  role: Role = {} as Role;

  @Input()
  club!: Club;

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

    for (const cat of this.claims) {
      this.selectedClaims.push(...cat.claims.filter((c) => c.hasPermission));
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
