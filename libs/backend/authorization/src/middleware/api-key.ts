import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  private readonly apiKey = '1234567890';

  use(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['api-key'];
    if (apiKey !== this.apiKey) {
      res.status(401).json({ message: 'Invalid API key' });
    } else {
      next();
    }
  }
}
