import { AdminSetting, AdminSettingUpdateInput, Player } from "@badman/backend-database";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { User } from "@badman/backend-authorization";
import { Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";

const SETTING_PERMISSIONS: Record<string, string[]> = {
  enrollment: ["change:enrollment"],
};

@Resolver(() => AdminSetting)
export class SettingResolver {
  private readonly logger = new Logger(SettingResolver.name);

  constructor(private _sequelize: Sequelize) {}

  @Query(() => AdminSetting, { nullable: true })
  async setting(@Args("key") key: string): Promise<AdminSetting | null> {
    return AdminSetting.findOne({ where: { key } });
  }

  @Query(() => [AdminSetting])
  async settings(): Promise<AdminSetting[]> {
    return AdminSetting.findAll();
  }

  @Mutation(() => AdminSetting)
  async updateSetting(
    @User() user: Player,
    @Args("data") updateData: AdminSettingUpdateInput,
  ) {
    const transaction = await this._sequelize.transaction();
    try {
      const setting = await AdminSetting.findByPk(updateData.id, { transaction });

      if (!setting) {
        throw new NotFoundException(`Setting not found`);
      }

      const requiredPermissions = SETTING_PERMISSIONS[setting.key];
      if (!requiredPermissions) {
        throw new NotFoundException(`No permissions configured for setting "${setting.key}"`);
      }

      if (!(await user.hasAnyPermission(requiredPermissions))) {
        throw new UnauthorizedException(
          `You do not have permission to edit the "${setting.key}" setting`,
        );
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
