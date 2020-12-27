import {
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLString
} from 'graphql';

const RankingPlaceResultType = new GraphQLObjectType({
  name: 'rankingPlaceResultType',
  fields: {
    level: {
      type: GraphQLInt
    },
    amount: {
      type: GraphQLInt
    }
  }
});

const RankingPlacesResultType = new GraphQLObjectType({
  name: 'rankingPlacesResultType',
  fields: {
    date: {
      type: GraphQLString
    },
    points: {
      type: new GraphQLList(RankingPlaceResultType)
    }
  }
});

const CountsResultType = new GraphQLObjectType({
  name: 'CountsResult',
  fields: {
    single: {
      type: new GraphQLList(RankingPlacesResultType)
    },
    double: {
      type: new GraphQLList(RankingPlacesResultType)
    },
    mix: {
      type: new GraphQLList(RankingPlacesResultType)
    }
  }
});

export interface RankingPlaceResult {
  level: number;
  amount: number;
}
export interface RankingPlacesResult {
  date: Date;
  points: RankingPlaceResult[];
}

export { RankingPlaceResultType, RankingPlacesResultType, CountsResultType };
