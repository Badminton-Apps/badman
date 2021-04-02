
export class Draw {
  id: string;
  name: string;
  type: string;
  size: number;

  constructor(args: Partial<Draw>) {
    this.id = args.id;
    this.name = args.name;
    this.type = args.type;
    this.size = args.size;
  }
}
