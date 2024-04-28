import { ValidationResult } from '@badman/frontend-models';
import { SubEventTypeEnum, TeamMembershipType } from '@badman/utils';
import { Apollo, gql } from 'apollo-angular';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import { TeamFormValue } from '../../team-enrollment.page';

export const validateEnrollment = (
  apollo: Apollo,
  teamForm?: { [key in SubEventTypeEnum]: TeamFormValue[] },

  season?: number,
  clubId?: string,
  transfers?: string[],
  loans?: string[],
) => {
  if (!teamForm || !season) {
    console.error('No teamForm or season provided');
    return of([]);
  }

  const teams: {
    id?: string;
    name?: string;
    type: SubEventTypeEnum;
    link?: string;
    teamNumber?: number;
    subEventId?: string;
    players?: string[];
    backupPlayers?: string[];
    basePlayers?: string[];
  }[] = [];

  //  type of SubEventTypeEnum
  for (const type in SubEventTypeEnum) {
    teamForm[type as SubEventTypeEnum].forEach((team) => {
      if (!team) return;
      if (!team.team) return;
      if (!team.team.type) return;
      if (!team.entry) return;

      teams.push({
        id: team.team.id,
        name: team.team.name,
        type: team.team.type,
        teamNumber: team.team.teamNumber,
        subEventId: team.entry.subEventId ?? undefined,
        link: team.team.link,
        players: team.team?.players?.map((p) => p.id)?.filter((p) => p) as string[],
        backupPlayers: team.team.players
          ?.filter((p) => p.teamMembership.membershipType == TeamMembershipType.BACKUP)
          ?.map((p) => p.id)
          ?.filter((p) => p) as string[],
        basePlayers: team.entry?.players?.map((p) => p?.id)?.filter((p) => p) as string[],
      });
    });
  }

  return apollo
    .query<{ enrollmentValidation: ValidationResult }>({
      fetchPolicy: 'no-cache',
      query: gql`
        query ValidateEnrollment($enrollment: EnrollmentInput!) {
          enrollmentValidation(enrollment: $enrollment) {
            teams {
              id
              linkId
              teamIndex
              baseIndex
              isNewTeam
              possibleOldTeam
              maxLevel
              minBaseIndex
              maxBaseIndex
              valid
              errors {
                message
                params
              }
              warnings {
                message
                params
              }
            }
          }
        }
      `,
      variables: {
        enrollment: {
          clubId,
          season,
          teams,
          transfers,
          loans,
        },
      },
    })
    .pipe(map((result) => result.data.enrollmentValidation?.teams ?? []));
};
