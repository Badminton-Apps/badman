import { Moment } from 'moment';

export interface SerieData {
  single: SerieDataType[];
  double: SerieDataType[];
  mix: SerieDataType[];
}

export interface SerieDataType {
  points: { name: number; value: number }[];
  date: Moment;
}
