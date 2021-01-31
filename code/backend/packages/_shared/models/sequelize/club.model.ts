import {
  BelongsToMany,
  Column,
  Model,
  Table,
  PrimaryKey,
  AutoIncrement,
  Unique,
  HasMany,
  IsUUID,
  Index,
  Default,
  DataType
} from 'sequelize-typescript';
import {
  BelongsToManyAddAssociationMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
  BuildOptions,
  HasManyGetAssociationsMixin
} from 'sequelize/types';
import { Team } from '../..';
import { ClubMembership } from './club-membership.model';
import { Player } from './player.model';

@Table({
  timestamps: true,
  schema: 'public'
})
export class Club extends Model<Club> {
  constructor(values?: Partial<Club>, options?: BuildOptions) {
    super(values, options);
  }
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique
  @Index
  @Column
  name: string;

  @Column
  abbreviation: string;

  @Column
  clubId?: number;

  @HasMany(() => Team, 'ClubId')
  teams?: Team[];

  @BelongsToMany(
    () => Player,
    () => ClubMembership
  )
  players: Player[];

  public getPlayers!: BelongsToManyGetAssociationsMixin<Player>;
  public addPlayer!: BelongsToManyAddAssociationMixin<Player, number>;
  public hasPlayer!: BelongsToManyHasAssociationMixin<Player, number>;
}
