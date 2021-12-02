import { GraphQLError as BaseGraphQLError } from 'graphql';
import { ApiError } from '@badvlasim/shared/utils/api.error';

export class GraphQLError extends BaseGraphQLError {
    originalError: ApiError;

}
