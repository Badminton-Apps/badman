import { WritableSignal, signal } from '@angular/core';

/**
 * This variable is used to store the signal
 * created inside `signalInputTransform` function
 * Then it is used to assign it to input property value,
 *
 * This variable should not be exported
 */
let inputSignalStore: WritableSignal<unknown>;

// export function signalInputTransform<
//   Value,
//   U extends Value | undefined = Value | undefined
// >(initialValue?: U): (value: Value | U) => Signal<Value | U>;
// export function signalInputTransform<Value>(initialValue: Value) {
//   const signalInput = signal<Value>(initialValue);
//   inputSignalStore = signalInput; // assigning internal signal to another variable
//   return (value: Value) => {
//     signalInput.set(value);
//     return signalInput;
//   };
// }

export function signalInputTransform(initialValue: unknown) {
  const signalInput = signal<unknown>(initialValue);
  inputSignalStore = signalInput; // assigning internal signal to another variable
  return (value: unknown) => {
    signalInput.set(value);
    return signalInput;
  };
}

export function signalInput<Value>(): WritableSignal<Value> {
  return inputSignalStore as WritableSignal<Value>;
}
