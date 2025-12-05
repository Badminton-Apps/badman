import { Player } from "@badman/backend-database";
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { env } from "process";
import { getRequest } from "../utils";
export const User = createParamDecorator(async (data: unknown, context: ExecutionContext) => {
  const request = getRequest(context);
  console.log("User Decorator:Data", data);
  const user = request["user"];

  // If we have a user in the request with both sub and id, return it (this is a full Player object)
  if (user?.sub && user?.id) {
    return user;
  }

  // If we have a sub but no id, the user doesn't exist in the database
  if (user?.sub && !user?.id) {
    // Log this issue for debugging
    console.warn(
      `User with sub "${user.sub}" authenticated but not found in database. User record needs to be created.`
    );
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
