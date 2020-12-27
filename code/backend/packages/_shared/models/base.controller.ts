import { Router } from 'express';
import { logger } from '../utils';

export class BaseController {
  constructor(public router: Router, public authRouter: Router) {
  }
}
