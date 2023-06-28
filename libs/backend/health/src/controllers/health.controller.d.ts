import { HealthCheckService } from '@nestjs/terminus';
export declare class HealthController {
    private health;
    constructor(health: HealthCheckService);
    check(): Promise<import("@nestjs/terminus").HealthCheckResult>;
}
