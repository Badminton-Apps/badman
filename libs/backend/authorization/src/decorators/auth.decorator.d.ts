import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
export declare class PermGuard implements CanActivate {
    private jwtService;
    private reflector;
    private configService;
    private readonly _logger;
    private readonly jwksClient;
    constructor(jwtService: JwtService, reflector: Reflector, configService: ConfigService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractTokenFromHeader;
    validateUser(payload: {
        sub?: string;
    }): Promise<{
        sub?: string | undefined;
    }>;
    validateToken(token: string): Promise<any>;
    private getPublicKey;
}
