import { User } from '@badman/backend-authorization';
import { Faq, FaqNewInput, FaqUpdateInput, Player } from '@badman/backend-database';
import { Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Sequelize } from 'sequelize-typescript';
import { ListArgs } from '../../utils';

@Resolver(() => Faq)
export class FaqResolver {
  private readonly logger = new Logger(FaqResolver.name);

  constructor(private _sequelize: Sequelize) {}

  @Query(() => Faq)
  async faq(@Args('id', { type: () => ID }) id: string): Promise<Faq | null> {
    return Faq.findByPk(id);
  }

  @Query(() => [Faq])
  async faqs(@Args() listArgs: ListArgs): Promise<Faq[]> {
    return Faq.findAll(ListArgs.toFindOptions(listArgs));
  }

  @Mutation(() => Faq)
  async createFaq(@User() user: Player, @Args('data') data: FaqNewInput) {
    if (!(await user.hasAnyPermission(['add:faq']))) {
      throw new UnauthorizedException(`You do not have permission to create a faq`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();

    try {
      const faq = await Faq.create(
        {
          ...data,
        },
        { transaction },
      );

      await transaction.commit();

      return faq;
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => Faq)
  async updateFaq(@User() user: Player, @Args('data') data: FaqUpdateInput) {
    if (!(await user.hasAnyPermission([`edit:faq`]))) {
      throw new UnauthorizedException(`You do not have permission to edit this faq`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const faq = await Faq.findByPk(data.id, { transaction });

      if (!faq) {
        throw new NotFoundException(`${Faq.name}: ${data.id}`);
      }

      // Update club
      const result = await faq.update(data, { transaction });

      // Commit transaction
      await transaction.commit();

      return result;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Boolean)
  async deleteFaq(@User() user: Player, @Args('id', { type: () => ID }) id: string) {
    if (!(await user.hasAnyPermission([`edit:faq`]))) {
      throw new UnauthorizedException(`You do not have permission to delete this faq`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const faq = await Faq.findByPk(id, { transaction });

      if (!faq) {
        throw new NotFoundException(`${Faq.name}: ${id}`);
      }

      // Update club
      await faq.destroy({ transaction });

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
