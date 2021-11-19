import { XmlTournament } from '@badvlasim/shared';
import { Transaction } from 'sequelize';

export class StepProcessor {
  constructor(protected readonly visualTournament: XmlTournament, protected readonly transaction: Transaction) {
    this.visualTournament = visualTournament;
    this.transaction = transaction;
  }
}
