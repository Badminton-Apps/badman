import { Player } from "@badman/backend-database";
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { env } from "process";
import { getRequest } from "../utils";
export const User = createParamDecorator(async (data: unknown, context: ExecutionContext) => {
  const request = getRequest(context);

  const user = request["user"];

  // If we have a user in the request, return it
  if (user?.sub && user?.id) {
    return user;
  }

  // If we don't have a user in the request, set the permissions to return false;
  return {
    hasAnyPermission: () => env["NODE_ENV"] === "development" || false,
    hasAllPermissions: () => env["NODE_ENV"] === "development" || false,
    toJSON: () => ({}),
    ...user,
  };
});

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
