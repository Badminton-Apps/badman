import { GraphQLError as BaseGraphQLError } from 'graphql';
import { ApiError } from '@badvlasim/shared';

export class GraphQLError extends BaseGraphQLError {
    originalError: ApiError;

}
