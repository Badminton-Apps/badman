import { Claim, Player, Role, RoleNewInput, RoleUpdateInput } from '@badman/backend-database';
import { Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Sequelize } from 'sequelize-typescript';
import { User } from '@badman/backend-authorization';
import { ListArgs } from '../../utils';

@Resolver(() => Role)
export class RoleResolver {
  private readonly logger = new Logger(RoleResolver.name);
  constructor(private _sequelize: Sequelize) {}

  @Query(() => Role)
  async role(@Args('id', { type: () => ID }) id: string): Promise<Role> {
    const role = await Role.findByPk(id);

    if (!role) {
      throw new NotFoundException(id);
    }
    return role;
  }

  @Query(() => [Role])
  async roles(@Args() listArgs: ListArgs): Promise<Role[]> {
    return Role.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Player])
  async players(@Parent() role: Role, @Args() listArgs: ListArgs): Promise<Player[]> {
    return role.getPlayers(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Claim])
  async claims(@Parent() role: Role, @Args() listArgs: ListArgs): Promise<Claim[]> {
    return role.getClaims(ListArgs.toFindOptions(listArgs));
  }

  @Mutation(() => Role)
  async updateRole(@User() user: Player, @Args('data') updateRoleData: RoleUpdateInput) {
    const dbRole = await Role.findByPk(updateRoleData.id);
    if (!dbRole) {
      throw new NotFoundException(`${Role.name}: ${updateRoleData.id}`);
    }

    if (
      !(await user.hasAnyPermission([
        `${dbRole.linkId}_edit:role`,
        `${dbRole.linkId}_edit:${dbRole.linkType}}`,
        'edit-any:club',
      ]))
    ) {
      throw new UnauthorizedException(`You do not have permission to edit this club`);
    }
    const transaction = await this._sequelize.transaction();
    try {
      await dbRole.update(updateRoleData, { transaction });

      await dbRole.setClaims(
        updateRoleData?.claims?.map((c) => c.id),
        { transaction },
      );

      await transaction.commit();
      return dbRole;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Boolean)
  async deleteRole(@User() user: Player, @Args('id', { type: () => ID }) id: string) {
    const dbRole = await Role.findByPk(id);
    if (!dbRole) {
      throw new NotFoundException(`${Role.name}: ${id}`);
    }

    if (
      !(await user.hasAnyPermission([
        `${dbRole.linkId}_edit:role`,
        `${dbRole.linkId}_edit:${dbRole.linkType}}`,
        'edit-any:club',
      ]))
    ) {
      throw new UnauthorizedException(`You do not have permission to edit this club`);
    }
    const transaction = await this._sequelize.transaction();
    try {
      await dbRole.destroy({ transaction });
      await transaction.commit();
      return true;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Role)
  async createRole(@User() user: Player, @Args('data') createRoleData: RoleNewInput) {
    if (
      !(await user.hasAnyPermission([
        `${createRoleData.linkId}_edit:role`,
        `${createRoleData.linkId}_edit:${createRoleData.linkType}}`,
        'edit-any:club',
      ]))
    ) {
      throw new UnauthorizedException(`You do not have permission to edit this club`);
    }

    const transaction = await this._sequelize.transaction();
    try {
      const dbRole = await Role.create(
        { ...createRoleData },
        {
          transaction,
        },
      );

      await dbRole.setClaims(
        createRoleData?.claims?.map((c) => c.id),
        { transaction },
      );

      await transaction.commit();
      return dbRole;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Boolean)
  async addPlayerToRole(
    @User() user: Player,
    @Args('roleId', { type: () => ID }) roleId: string,
    @Args('playerId', { type: () => ID }) playerId: string,
  ) {
    const dbRole = await Role.findByPk(roleId);

    if (!dbRole) {
      throw new NotFoundException(`${Role.name}: ${roleId}`);
    }

    if (
      !(await user.hasAnyPermission([
        `${dbRole.linkId}_edit:role`,
        `${dbRole.linkId}_edit:${dbRole.linkType}}`,
        'edit-any:club',
      ]))
    ) {
      throw new UnauthorizedException(`You do not have permission to edit this club`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const dbPlayer = await Player.findByPk(playerId, {
        transaction,
      });

      if (!dbPlayer) {
        throw new NotFoundException(`${Player.name}: ${playerId}`);
      }

      await dbRole.addPlayer(dbPlayer, {
        transaction,
      });

      // Commit transaction
      await transaction.commit();
      return true;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Boolean)
  async removePlayerFromRole(
    @User() user: Player,
    @Args('roleId', { type: () => ID }) roleId: string,
    @Args('playerId', { type: () => ID }) playerId: string,
  ) {
    const dbRole = await Role.findByPk(roleId);

    if (!dbRole) {
      throw new NotFoundException(`${Role.name}: ${roleId}`);
    }

    if (
      !(await user.hasAnyPermission([
        `${dbRole.linkId}_edit:role`,
        `${dbRole.linkId}_edit:${dbRole.linkType}}`,
        'edit-any:club',
      ]))
    ) {
      throw new UnauthorizedException(`You do not have permission to edit this club`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const dbPlayer = await Player.findByPk(playerId, {
        transaction,
      });

      if (!dbPlayer) {
        throw new NotFoundException(`${Player.name}: ${playerId}`);
      }

      await dbRole.removePlayer(dbPlayer, {
        transaction,
      });

      // Commit transaction
      await transaction.commit();
      return true;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }
}
