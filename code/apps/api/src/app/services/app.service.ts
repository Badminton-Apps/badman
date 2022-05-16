import { Player } from '@badman/api/database';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  
  constructor(){
    this.logger.debug('AppService');
  }

  getData() {
    return Player.findOne();
  } 
}
