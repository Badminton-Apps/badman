import { Model, ModelCtor } from 'sequelize-typescript';
type ModelAttributes<T> = Omit<T, keyof Model>;
type CreationAttributes<T> = {
  [key in keyof ModelAttributes<T>]?: ModelAttributes<T>[key];
};

// 1. Created a strict typed model class
export class TypedModel<T> extends Model<
  ModelAttributes<T>,
  CreationAttributes<T>
> {
  // provides a less strict type Model
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static get Model(): ModelCtor {
    return this as any;
  }
}
 