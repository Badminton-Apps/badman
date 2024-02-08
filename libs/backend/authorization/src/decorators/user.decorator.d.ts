import { Player } from '@badman/backend-database';
export declare const User: (...dataOrPipes: unknown[]) => ParameterDecorator;
export interface LoggedInUser extends Player {
    context: {
        iss: string;
        sub: string;
        aud: string[];
        iat: number;
        exp: number;
        azp: string;
        scope: string;
    };
}
