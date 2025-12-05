import { Player } from "@badman/backend-database";
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { FastifyRequest } from "fastify";
import { JwksClient } from "jwks-rsa";
import { getRequest } from "../utils";
import { ALLOW_ANONYMOUS_META_KEY } from "./anonymous.decorator";

@Injectable()
export class PermGuard implements CanActivate {
  private readonly _logger = new Logger(PermGuard.name);
  private readonly jwksClient: JwksClient;

  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private configService: ConfigService
  ) {
    this.jwksClient = new JwksClient({
      cache: true,
      jwksUri: `${this.configService.get("AUTH0_ISSUER_URL")}/.well-known/jwks.json`,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(ALLOW_ANONYMOUS_META_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // 💡 See this condition
      return true;
    }

    const request = getRequest(context);

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this._logger.debug("No token found in request headers");
      return true;
    }

    try {
      const payload = await this.validateToken(token);

      if (!payload) {
        this._logger.error("Token validation returned undefined/null payload");
        throw new UnauthorizedException("Invalid token");
      }

      this._logger.debug(`Token validated successfully. Payload sub: ${payload.sub}`);

      // 💡 We're assigning the payload to the request object here
      // so that we can access it in our route handlers
      const user = await this.validateUser(payload);
      request["user"] = user;

      const userId = user instanceof Player ? user.id : undefined;
      this._logger.debug(
        `User validation result: ${userId ? `Found user ${userId}` : `No user found (sub: ${payload.sub})`}`
      );
    } catch (e) {
      this._logger.error("Invalid token", e);
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: FastifyRequest): string | undefined {
    const [type, token] = request?.headers?.["authorization"]?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }

  async validateUser(payload: { sub?: string }) {
    if (!payload || !payload.sub) {
      this._logger.warn("Token payload missing 'sub' claim. Payload:", JSON.stringify(payload));
      return payload;
    }

    this._logger.debug(`Looking up user with sub: "${payload.sub}"`);

    try {
      const user = await Player.findOne({
        where: { sub: payload.sub },
      });

      if (user) {
        this._logger.debug(
          `✅ User found in database: ${user.id} (sub: ${payload.sub}, email: ${user.email})`
        );
        return user;
      } else {
        // Try to find users with similar sub to help debug
        const similarUsers = await Player.findAll({
          where: {
            sub: {
              [require("sequelize").Op.like]: `%${payload.sub.split("|").pop()}%`,
            },
          },
          limit: 5,
          attributes: ["id", "email", "sub"],
        });

        this._logger.warn(
          `❌ User not found in database for sub: "${payload.sub}". Token is valid but user record doesn't exist.`
        );

        if (similarUsers.length > 0) {
          this._logger.warn(
            `Found ${similarUsers.length} users with similar sub values:`,
            similarUsers.map((u) => ({ id: u.id, email: u.email, sub: u.sub }))
          );
        } else {
          this._logger.warn(
            `No users found with similar sub values. Checking all users with sub field...`
          );
          const usersWithSub = await Player.findAll({
            where: { sub: { [require("sequelize").Op.ne]: null } },
            limit: 3,
            attributes: ["id", "email", "sub"],
          });
          this._logger.warn(
            `Sample of users with sub field:`,
            usersWithSub.map((u) => ({ id: u.id, email: u.email, sub: u.sub }))
          );
        }
      }
    } catch (e) {
      this._logger.error(`Error looking up user with sub "${payload.sub}":`, e);
    }

    // Return payload if user not found - this will cause issues downstream but allows debugging
    return payload;
  }

  async validateToken(token: string) {
    try {
      const publicKey = await this.getPublicKey();
      const audience = this.configService.get("AUTH0_AUDIENCE");
      const issuer = `${this.configService.get("AUTH0_ISSUER_URL")}/`;

      this._logger.debug(`Validating token. Expecting: audience: ${audience}, issuer: ${issuer}`);

      console.log("Decoded Token:", this.jwtService.decode(token));

      const payload = this.jwtService.verify(token, {
        algorithms: ["RS256"],
        publicKey,
        audience,
        issuer,
      });

      this._logger.debug(
        `Token verified successfully. Payload keys: ${Object.keys(payload).join(", ")}`
      );
      return payload;
    } catch (error) {
      // Handle token validation error
      this._logger.error(`Error validating token:`, error);
      throw error; // Re-throw so canActivate can handle it
    }
  }

  private async getPublicKey(): Promise<string | Buffer> {
    const kid = "MzAzRUEwRTA3RjNDOENGRjA2Qzk3RUFFMkMzMjczNEY2NTI4RjIyQw";
    const signingKey = await this.jwksClient.getSigningKey(kid);

    return signingKey.getPublicKey();
  }
}
