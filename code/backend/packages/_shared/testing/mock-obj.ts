// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MockObj<T> = { [P in keyof T]?: jest.Mock<T[P]> | any };
