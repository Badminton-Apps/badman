import { Injectable, Logger } from '@nestjs/common';
import {
  EventCompetition
} from '@badman/api/database';

@Injectable()
export class CpGeneratorService {
  private readonly logger = new Logger(CpGeneratorService.name);


  public async generateCpFile(eventId: string){
    this.logger.debug('Started generating CP file');

    const event = await EventCompetition.findByPk(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    this.logger.debug(`Event found: ${event.name}`);
  }
}
