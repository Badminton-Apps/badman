import { gql } from 'apollo-angular';

export const AssignLocationEvent = gql`
  mutation AssignLocationEvent(
    $locationId: ID!
    $eventId: ID!
    $use: Boolean!
  ) {
    updateCompetitionEventLocation(
      eventId: $eventId
      locationId: $locationId
      use: $use
    ) {
      id
    }
  }
`;
