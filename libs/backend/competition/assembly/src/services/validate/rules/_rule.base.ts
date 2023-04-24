import { AssemblyValidationData, AssemblyOutput } from '../../../models';

export abstract class Rule {
  abstract validate(assembly: AssemblyValidationData): Promise<AssemblyOutput>;
}
