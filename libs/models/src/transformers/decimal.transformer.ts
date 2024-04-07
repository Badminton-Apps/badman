// transformer
export class DecimalColumnTransformer {
  to(data: number): number {
      return data;
  }
  from(data: string): number {
      return parseFloat(data);
  }
}