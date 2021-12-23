import { Transaction } from 'sequelize/dist';

export type Slugify<TModel> = (transaction?: Transaction) => Promise<TModel>;
