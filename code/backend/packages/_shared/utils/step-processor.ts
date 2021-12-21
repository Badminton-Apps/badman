import { Transaction } from 'sequelize';
import { XmlTournament } from '../models';

export class StepProcessor {
  constructor(protected readonly visualTournament: XmlTournament, protected readonly transaction: Transaction) {
    this.visualTournament = visualTournament;
    this.transaction = transaction;
  }
}
