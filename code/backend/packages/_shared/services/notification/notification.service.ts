import { DataBaseHandler } from '../../database';
import { EncounterChange } from '../../models';
import { MailService } from '../mail';

export class NotificationService {
  
  private _mailService: MailService;
  constructor(private _databaseService: DataBaseHandler) {
    this._mailService = new MailService(this._databaseService);
  }

  clubEnrolled(email: string, clubId: string, year: number) {
    return this._mailService.sendClubMail(email, clubId, year);
  }

  requestChange(encounterChange: EncounterChange, homeTeamRequests: boolean) {
    return this._mailService.sendRequestMail(encounterChange, homeTeamRequests);
  }

  requestFinished(encounterChange: EncounterChange) {
    return this._mailService.sendRequestFinishedMail(encounterChange);
  }
}
