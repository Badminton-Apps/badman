import { Router } from 'express';

export class BaseController {
  constructor(public router: Router) {
  }
}
