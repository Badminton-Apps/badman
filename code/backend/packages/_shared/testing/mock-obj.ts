export type MockObj<T> = { [P in keyof T]?: jest.Mock<T[P]> | any };
