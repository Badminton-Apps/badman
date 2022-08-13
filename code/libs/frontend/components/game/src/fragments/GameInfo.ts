import { gql } from 'apollo-angular';

export const GAME_INFO = gql`
  fragment GameInfo on Game {
    id
    set1Team1
    set1Team2
    set2Team1
    set2Team2
    set3Team1
    set3Team2
    winner
    order
    round
    status
    players {
      id
      team
      player
      slug
      fullName
    }
  }
`;
