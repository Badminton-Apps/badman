import { GraphQLError as BaseGraphQLError } from 'graphql';
import { ApiError } from './api.error';

export class GraphQLError extends BaseGraphQLError {
    originalError: ApiError;

}
