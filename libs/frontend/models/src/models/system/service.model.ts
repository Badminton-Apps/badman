export class Service {
  id?: string;
  name?: string;
  status?: 'starting' | 'started' | 'stopped';

  constructor(args: Partial<Service>) {
    this.id = args?.id;
    this.name = args?.name;
    this.status = args?.status;
  }
}
