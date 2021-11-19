export class Claim {
  id?: string;
  name?: string;
  description?: string;
  category?: string;
  hasPermission?: boolean

  constructor({ ...args }: Partial<Claim>) {
    this.id = args.id;
    this.name = args.name;
    this.description = args.description;
    this.category = args.category;
    this.hasPermission = args.hasPermission;
  }
}
