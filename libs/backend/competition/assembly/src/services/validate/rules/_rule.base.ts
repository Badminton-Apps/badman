import { ValidationRule } from '@badman/backend-validation';
import { AssemblyValidationData, AssemblyOutput } from '../../../models';

export abstract class Rule extends ValidationRule<AssemblyValidationData, AssemblyOutput> {}
