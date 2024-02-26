/* eslint-disable @typescript-eslint/no-explicit-any */
export class ProcessStep<T = void> {
  private _data?: T;
  private _ran = false;
  constructor(
    public name: string,
    public execute: (args?: any) => Promise<T>,
  ) {}

  public async executeStep(args?: any): Promise<boolean> {
    this._data = await this.execute(args);
    this._ran = true;

    return (this._data as any)?.stop ?? false;
  }

  getData<Y>(): Y {
    if (!this._ran) {
      throw new Error("Step hasn't been executed yet");
    }
    return this._data as unknown as Y;
  }
}
