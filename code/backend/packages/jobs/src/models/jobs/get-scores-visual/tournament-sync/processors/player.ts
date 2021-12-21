import {
  correctWrongPlayers,
  EventTournament,
  Player,
  StepProcessor,
  XmlGenderID,
  XmlTournament
} from '@badvlasim/shared';
import { Op, Transaction } from 'sequelize';
import { VisualService } from '../../../visualService';

export class TournamentSyncPlayerProcessor extends StepProcessor {
  public event: EventTournament;

  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly transaction: Transaction,
    protected readonly visualService: VisualService
  ) {
    super(visualTournament, transaction);
  }

  public async process(): Promise<Map<string, Player>> {
    const mapPlayers = new Map<string, Player>();
    const visualPlayers = (await this.visualService.getPlayers(this.visualTournament.Code)).map(
      (xmlPlayer) => {
        if (!xmlPlayer) {
          return null;
        }

        return {
          player: correctWrongPlayers({
            memberId: xmlPlayer?.MemberID ? `${xmlPlayer?.MemberID}` : null,
            firstName: xmlPlayer.Firstname,
            lastName: xmlPlayer.Lastname,
            gender:
              xmlPlayer.GenderID === XmlGenderID.Boy || xmlPlayer.GenderID === XmlGenderID.Male
                ? 'M'
                : 'F'
          }),
          xmlMemberId: xmlPlayer?.MemberID
        };
      }
    );

    const ids = visualPlayers.map((p) => `${p?.player.memberId}`);

    const players = await Player.findAll({
      where: {
        memberId: {
          [Op.in]: ids
        }
      },
      transaction: this.transaction
    });

    for (const xmlPlayer of visualPlayers) {
      let foundPlayer = players.find((r) => r.memberId === `${xmlPlayer?.player?.memberId}`);

      if (
        !foundPlayer &&
        xmlPlayer?.player?.memberId != null &&
        xmlPlayer?.player?.lastName?.toLowerCase().indexOf('onbekend') === -1
      ) {
        foundPlayer = await new Player(xmlPlayer?.player).save({
          transaction: this.transaction
        });
        // Push to the list if player exists twice
        players.push(foundPlayer);
      }
      mapPlayers.set(`${xmlPlayer?.xmlMemberId}`, foundPlayer);
    }
    return mapPlayers;
  }
}
