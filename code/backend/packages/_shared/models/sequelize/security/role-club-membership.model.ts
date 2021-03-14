import { Column, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Club } from '../club.model';
import { Role } from './role.model';

@Table({
  timestamps: true,
  schema: 'security'
})
export class ClubRoleMembership extends Model {
  @ForeignKey(() => Club)
  @Column
  clubId: number;

  @ForeignKey(() => Role)
  @Column
  roleId: number;
}
