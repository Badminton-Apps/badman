import { gql } from "apollo-angular";

export const EVENT_TEAMS_EXPORT_QUERY = gql`
  query EventCompetitionTeamsExport($id: ID!) {
    eventCompetition(id: $id) {
      id
      name
      subEventCompetitions {
        id
        drawCompetitions {
          id
          eventEntries {
            id
            team {
              id
              name
              preferredDay
              preferredTime
              club {
                id
                name
              }
            }
          }
        }
      }
    }
  }
`;

export const EVENT_EXCEPTIONS_EXPORT_QUERY = gql`
  query EventCompetitionExceptionsExport($id: ID!) {
    eventCompetition(id: $id) {
      id
      name
      subEventCompetitions {
        id
        drawCompetitions {
          id
          eventEntries {
            id
            team {
              id
              club {
                id
                name
                locations {
                  id
                  name
                  availabilities {
                    id
                    season
                    exceptions {
                      start
                      end
                      courts
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;
