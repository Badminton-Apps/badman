export class ProcessStep<T> {
  private _data: any;
  private _ran: boolean = false;
  constructor(public name: string, public execute: (args: any) => Promise<any>) {}

  public async executeStep(args: any): Promise<boolean> {
    this._data = await this.execute(args);
    this._ran = true;
   
    return this._data?.stop ?? false;
  }

  getData() {
    if (!this._ran) {
      throw new Error("Step hasn't been executed yet");
    }
    return this._data;
  }
}
