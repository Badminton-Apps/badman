import { Availability, Location } from '@badman/backend-database';
import { Injectable, Logger } from '@nestjs/common';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class CopyAvailibiltyRunner {
  private readonly logger = new Logger(CopyAvailibiltyRunner.name);
  constructor(private _sequelize: Sequelize) {}

  async process() {
    const transaction = await this._sequelize.transaction();

    this.logger.verbose(`Starting copy`);

    const season2022 = await Availability.findAll({
      where: {
        season: 2022,
        locationId: {
          [Op.ne]: null,
        },
      },
      include: [
        {
          model: Location,
        },
      ],
      transaction,
    });

    const season2023 = await Availability.findAll({
      where: {
        season: 2023,
        locationId: {
          [Op.ne]: null,
        },
      },
      transaction,
    });

    // copy all availibilty from 2022 to 2023 where the location is the same and didn't exist in 2023
    for (const availibilty of season2023) {
      const existing = season2022.find(
        (a) => a.locationId === availibilty.locationId
      );

      if (!existing) {
        await new Availability({
          ...availibilty.toJSON(),
          id: undefined,
          exceptions: undefined,
          season: 2022,
        }).save({ transaction });
      } else if ((existing?.days?.length ?? 0) <= 0) {
        this.logger.verbose(
          `Days for ${availibilty.locationId} ${existing?.location?.name} ${existing?.days?.length} ${availibilty.days?.length}`
        );

        existing.days = availibilty.days;
        existing.changed('days', true);
        await existing.save({ transaction });
      }
    }

    await transaction.commit();

    this.logger.verbose(`Copied done`);
  }
}
