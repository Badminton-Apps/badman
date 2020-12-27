import { EnumToArrayPipe } from './enum-to-array.pipe';

describe('EnumToArrayPipe', () => {
  it('create an instance', () => {
    const pipe = new EnumToArrayPipe();
    expect(pipe).toBeTruthy();
  });
});
