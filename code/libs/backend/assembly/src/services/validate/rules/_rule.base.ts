import { AssemblyData, AssemblyOutput } from '../../../models';

export abstract class Rule {
  abstract validate(assembly: AssemblyData): Promise<AssemblyOutput>;
}
