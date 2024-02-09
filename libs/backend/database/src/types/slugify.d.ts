import { Transaction } from 'sequelize';
export type Slugify<TModel> = (transaction?: Transaction) => Promise<TModel>;
