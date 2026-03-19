import { EnrollmentSetting, EnrollmentSettingUpdateInput, Player } from "@badman/backend-database";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { User } from "@badman/backend-authorization";
import { Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";

@Resolver(() => EnrollmentSetting)
export class EnrollmentSettingResolver {
  private readonly logger = new Logger(EnrollmentSettingResolver.name);

  constructor(private _sequelize: Sequelize) {}

  @Query(() => EnrollmentSetting, { nullable: true })
  async enrollmentSetting(): Promise<EnrollmentSetting | null> {
    return EnrollmentSetting.findOne();
  }

  @Mutation(() => EnrollmentSetting)
  async updateEnrollmentSetting(
    @User() user: Player,
    @Args("data") updateData: EnrollmentSettingUpdateInput,
  ) {
    if (!(await user.hasAnyPermission(["change:enrollment"]))) {
      throw new UnauthorizedException(`You do not have permission to edit enrollment settings`);
    }

    const transaction = await this._sequelize.transaction();
    try {
      const setting = await EnrollmentSetting.findOne({ transaction });

      if (!setting) {
        throw new NotFoundException(`EnrollmentSetting not found`);
      }

      const result = await setting.update(updateData, { transaction });

      await transaction.commit();

      return result;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }
}
