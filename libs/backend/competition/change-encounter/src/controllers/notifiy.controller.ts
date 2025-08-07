import { User } from "@badman/backend-authorization";

import { EncounterChange, Player, Team } from "@badman/backend-database";
import { Controller, Get, Logger, Query, UnauthorizedException } from "@nestjs/common";
import { EncounterValidationOutput } from "../models";
import { EncounterValidationService } from "../services";

@Controller()
export class ChangeEncounterController {
  private readonly logger = new Logger(ChangeEncounterController.name);

  constructor(
    // private mailingService: MailingService,
    private encounterValidationService: EncounterValidationService
  ) {}

  @Get("notify-openrequests")
  async notifyOpenRequset(@User() user: Player, @Query() query: { season: string }) {
    // only allow this for me
    if (user.slug != "glenn-latomme") {
      throw new UnauthorizedException("You do not have permission to do this");
    }

    let count = await Team.count({
      where: {
        season: query.season,
      },
    });

    // send mails to each team in bulk of 50
    while (count > 0) {
      const teams = await Team.findAll({
        where: {
          season: query.season,
        },
        limit: 50,
        offset: count,
        order: [["id", "ASC"]],
        include: [{ model: Player, as: "captain" }],
      });

      for (const team of teams) {
        const encountersH = await team.getHomeEncounters({
          include: [{ model: EncounterChange }],
        });
        const encountersA = await team.getAwayEncounters({
          include: [{ model: EncounterChange }],
        });

        const validation: EncounterValidationOutput[] = [];
        for (const encounter of encountersH) {
          validation.push(
            await this.encounterValidationService.validate({
              encounterId: encounter.id,
            })
          );
        }

        for (const encounter of encountersA) {
          validation.push(
            await this.encounterValidationService.validate({
              encounterId: encounter.id,
            })
          );
        }

        // this.mailingService.sendOpenRequestMail(
        //   {
        //     fullName: team.captain.fullName,
        //     email: team.email ?? team.captain.email,
        //     slug: team.slug,
        //   },
        //   encountersH.concat(encountersA),
        //   validation,
        // );
      }

      count -= 50;
    }
  }
}
