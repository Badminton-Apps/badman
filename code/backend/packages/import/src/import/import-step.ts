export class ImportStep<Output> {
  private _data: Output;
  private _ran: boolean = false;

  constructor(public name: string, public execute: (args: any) => Promise<Output>) {}

  public async executeStep(args: any) {
    this._data = await this.execute(args);
    this._ran = true;
  }

  getData() {
    if (!this._ran) {
      throw new Error("Step hasn't been executed yet");
    }
    return this._data;
  }
}
