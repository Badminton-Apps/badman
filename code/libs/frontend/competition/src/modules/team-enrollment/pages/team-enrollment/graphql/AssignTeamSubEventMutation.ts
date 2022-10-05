import { gql } from 'apollo-angular';

export const AssignTeamSubEvent = gql`mutation AssignTeamSubEvent($teamId: ID!, $subEventId: ID!) {
  updateSubEventTeam(teamId: $teamId, subEventId: $subEventId) {
    id
  }
}
`