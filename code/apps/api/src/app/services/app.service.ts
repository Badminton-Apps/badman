import { Player } from '@badman/api/database';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getData() {
    return Player.findOne();
  } 
}
