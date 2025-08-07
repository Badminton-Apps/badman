import { gql } from "apollo-angular";

export const EVENT_QUERY = gql`
  query EventCompetition($id: ID!) {
    eventCompetition(id: $id) {
      id
      name
      slug
      season
      openDate
      closeDate
      changeOpenDate
      changeCloseDatePeriod1
      changeCloseDatePeriod2
      changeCloseRequestDatePeriod1
      changeCloseRequestDatePeriod2
      visualCode
      official
      lastSync
      contactEmail
      contactId
      teamMatcher
      type
      state
      country
      checkEncounterForFilledIn
      meta {
        amountOfBasePlayers
      }
      exceptions {
        start
        end
        courts
      }
      infoEvents {
        start
        end
        name
        allowCompetition
      }
      subEventCompetitions {
        id
        name
        eventType
        level
        maxLevel
        minBaseIndex
        maxBaseIndex
        eventId
        drawCompetitions {
          id
          name
          size
        }
      }
    }
  }
`;
