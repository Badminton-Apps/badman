export abstract class ValidationRule<T, O> {
  // a description of the rule
  // abstract description: string;

  static description: string;

  abstract validate(assembly: T): Promise<O>;
}
