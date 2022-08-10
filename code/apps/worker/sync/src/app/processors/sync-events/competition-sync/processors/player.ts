import { EventCompetition, Player } from '@badman/backend/database';
import { Op } from 'sequelize';
import { StepProcessor, StepOptions } from '../../../../processing';
import { VisualService } from '../../../../services';
import {
  XmlTournament,
  correctWrongPlayers,
  XmlGenderID,
} from '../../../../utils';

export class CompetitionSyncPlayerProcessor extends StepProcessor {
  public event: EventCompetition;

  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly visualService: VisualService,
    options?: StepOptions
  ) {
    super(options);
  }

  public async process(): Promise<Map<string, Player>> {
    const mapPlayers = new Map<string, Player>();
    const visualPlayers = (
      await this.visualService.getPlayers(this.visualTournament.Code)
    ).map((xmlPlayer) => {
      if (!xmlPlayer) {
        return null;
      }

      return {
        player: correctWrongPlayers({
          memberId: xmlPlayer?.MemberID ? `${xmlPlayer?.MemberID}` : null,
          firstName: xmlPlayer.Firstname,
          lastName: xmlPlayer.Lastname,
          gender:
            xmlPlayer.GenderID === XmlGenderID.Boy ||
            xmlPlayer.GenderID === XmlGenderID.Male
              ? 'M'
              : 'F',
        }),
        xmlMemberId: xmlPlayer?.MemberID,
      };
    });

    const ids = visualPlayers.map((p) => `${p?.player.memberId}`);

    const players = await Player.findAll({
      where: {
        memberId: {
          [Op.in]: ids,
        },
      },
      transaction: this.transaction,
    });

    for (const xmlPlayer of visualPlayers) {
      let foundPlayer = players.find(
        (r) => r.memberId === `${xmlPlayer?.player?.memberId}`
      );
      let memberId = xmlPlayer?.xmlMemberId;

      if (!foundPlayer) {
        // Try finding with same first and last name (technically this can be the wrong person, but at this point how do we know?)
        foundPlayer = await Player.findOne({
          where: {
            [Op.or]: [
              {
                firstName: xmlPlayer?.player?.firstName ?? '',
                lastName: xmlPlayer?.player?.lastName ?? '',
              },
              {
                firstName: xmlPlayer?.player?.lastName ?? '',
                lastName: xmlPlayer?.player?.firstName ?? '',
              },
            ],
          },
          transaction: this.transaction,
        });
      }

      if (!foundPlayer) {
        // Create if not found
        foundPlayer = await new Player(xmlPlayer?.player).save({
          transaction: this.transaction,
        });
        // Push to the list if player exists twice
        players.push(foundPlayer);
        memberId = foundPlayer.memberId;
      }

      // Set with memberId
      mapPlayers.set(`${memberId}`, foundPlayer);
    }
    return mapPlayers;
  }
}
