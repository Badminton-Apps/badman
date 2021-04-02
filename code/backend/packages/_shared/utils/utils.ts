/**
 * Valid types for an objects key
 */
export type ObjectKey = string | number;

/**
 * Function that can be passed to reduce
 */
export type Reducer<T, U> = (
  previousValue: U,
  currentValue: T,
  currentIndex: number,
  array: T[]
) => U;

/**
 * Function the generates a key for a given value
 */
export type KeyGenerator<T> = (item: T) => ObjectKey;

/**
 * Return a function that can be used to reduce an array to an object of U indexed by the string returned by the given
 * function.
 *
 * Example usage:
 *
 * const people = [{name: "Bob", age: 1}, {name: "Bill", age: 2}];
 * const peopleByName = people.reduce(indexBy(person => person.name), {});
 *
 * ```javascript
 * {
 *   Bob: {name: "Bob", age: 1},
 *   Bill: {name: "Bill", age: 2}
 * }
 *```
 */
export const indexBy = <T>(
  fn: KeyGenerator<T>
): Reducer<T, Record<ObjectKey, T>> => {
  return (
    previousValue: Record<ObjectKey, T>,
    currentValue: T
  ): Record<ObjectKey, T> => {
    previousValue[fn(currentValue)] = currentValue;

    return previousValue;
  };
};

/**
 * Return a function that can be used to reduce an array to an object of U[] indexed by the string returned by the given
 * function.
 *
 * Example usage:
 *
 * const people = [{name: "Bob", age: 1}, {name: "Bill", age: 2}, {name: "Bob", age: 3}];
 * const peopleByName = people.reduce(groupBy(person => person.name), {});
 *
 * ```javascript
 * {
 *   Bob: [{name: "Bob", age: 1}, {name: "Bob", age: 3}],
 *   Bill: [{name: "Bill", age: 2}]
 * }
 * ```
 */
export const groupBy = <T>(
  fn: KeyGenerator<T>
): Reducer<T, Record<ObjectKey, T[]>> => {
  return (
    previousValue: Record<ObjectKey, T[]>,
    currentValue: T
  ): Record<ObjectKey, T[]> => {
    const key = fn(currentValue);
    (previousValue[key] = previousValue[key] || []).push(currentValue);

    return previousValue;
  };
};

/**
 * Return a function that can be used to reduce an array to an object of string -> U
 *
 * Example usage:
 *
 * const people = [{name: "Bob", age: 1}, {name: "Bill", age: 2}, {name: "Bob", age: 3}];
 * const ageByName = people.reduce(keyValue(person => [person.name, person.age]), {});
 *
 * ```javascript
 * {
 *   Bob: 3,
 *   Bill: 2
 * }
 * ```
 *
 * Note that any duplicate keys are overridden.
 */
export const keyValue = <T, U>(
  fn: (item: T) => [ObjectKey, U]
): Reducer<T, Record<ObjectKey, U>> => {
  return (prev: Record<ObjectKey, U>, item: T) => {
    const [key, value] = fn(item);

    prev[key] = value;

    return prev;
  };
};

/**
 * Utility function that safely creates a nested object using the given keys and sets the value to the final key.
 *
 * let peopleIndex = {};
 * const person1 = { name: "John", country: "AU", city: "Perth" };
 * const person1 = { name: "Bob", country: "UK", city: "London" };
 *
 * peopleIndex = setNested(person1, peopleIndex, person1.country, person1.city);
 * peopleIndex = setNested(person2, peopleIndex, person2.country, person2.city);
 *
 * ```javascript
 * {
 *   UK: {
 *     London: { name: "Bob", country: "UK", city: "London"},
 *   },
 *   AU: {
 *     Perth: { name: "John", country: "AU", city: "Perth"}
 *   }
 * };
 * ```
 */
export const setNested = <T, U>(value: U, root: T, ...keys: ObjectKey[]): T => {
  let base: any = root;

  for (const key of keys.slice(0, -1)) {
    base = base[key] = base[key] || {};
  }

  const lastKey = keys[keys.length - 1];

  base[lastKey] = value;

  return root;
};

/**
 * Utility function that safely creates a nested object using the given keys and pushes the value to the final key.
 *
 * let peopleIndex = {};
 * const person1 = { name: "John", country: "UK", city: "London" };
 * const person2 = { name: "John", country: "UK", city: "London" };
 *
 * peopleIndex = pushNested(person1, peopleIndex, person1.country, person1.city);
 * peopleIndex = pushNested(person2, peopleIndex, person2.country, person2.city);
 *
 * ```javascript
 * {
 *   UK: {
 *     London: [
 *       { name: "Bob", country: "UK", city: "London"},
 *       { name: "John", country: "UK", city: "London"}
 *     ]
 *   }
 * };
 * ```
 */
export const pushNested = <T, U>(
  value: U,
  root: T,
  ...keys: ObjectKey[]
): T => {
  let base: any = root;

  for (const key of keys.slice(0, -1)) {
    base = base[key] = base[key] || {};
  }

  const lastKey = keys[keys.length - 1];

  base[lastKey] = base[lastKey] || [];
  base[lastKey].push(value);

  return root;
};

/**
 * Given a map of T this function will examine each key in left to right order and add the values of those keys to an
 * array.
 *
 * Example usage:
 *
 * const animals = { cat: { name: "Kitty" }, cow: { name: "MooMoo" }, dog: { name: "Barky"  }, fish: { name: "Bloop" } }
 * const favouriteAnimals = preferentialKeySearch(animals, "aardvark", "fish", "cow");
 *
 * There are no aardvarks so you get your first preference of fish followed by cow:
 *
 * ```javascript
 * [
 *   { name: "Bloop" },
 *   { name: "MooMoo" },
 * ]
 * ```
 *
 * This method is useful for searching through multiple keys and falling back to another key if the first is not found.
 *
 */
export const preferentialKeySearch = <T>(
  obj: Record<ObjectKey, T>,
  ...keys: ObjectKey[]
): T[] => {
  const values: T[] = [];

  for (const key of keys) {
    if (obj[key]) {
      values.push(obj[key]);
    }
  }

  return values;
};

/**
 * This function recursively search through object tree using the given keys. Results are yielded in order of
 * preference. If at any point one of the keys is not set it will fallback to the fallbackKey.
 *
 * Example Usage:
 *
 * ```javascript
 * discounts: {
 *   "ALL": {
 *     "ALL": "10%",
 *     "StationA": "15%",
 *     "StationB": "20%",
 *     "StationC": "25%"
 *   },
 *   "StationA": {
 *     "ALL": "30%",
 *     "StationB": "40%"
 *   }
 *   "StationB": {
 *     "ALL": "50%",
 *     "StationA": "60%"
 *   }
 * }
 * ```
 * nestedObjectSearch(discounts, "ALL", "StationA", "StationB"); // ["40%", "30%", "20%", "10%"]
 * nestedObjectSearch(discounts, "ALL", "StationC", "StationB"); // ["20%", "10%"]
 * nestedObjectSearch(discounts, "ALL", "StationB", "StationC"); // ["50%", "25%", "10%"],
 * nestedObjectSearch(discounts, "ALL", "StationC", "StationD"); // ["10%"]
 */
export function* nestedObjectSearch(
  obj: any,
  fallbackKey: ObjectKey,
  ...keys: ObjectKey[]
): any | undefined {
  // find all the results at this search level
  const values = preferentialKeySearch(obj, keys[0], fallbackKey);

  for (const value of values) {
    // if this is the last iteration return the values
    if (keys.length === 1) {
      yield value;
    }
    // otherwise continue to go deeper into the object
    else {
      yield* nestedObjectSearch(value, fallbackKey, ...keys.slice(1));
    }
  }
}

/**
 * This function recursively search through object tree using the given keys. Unlike nestedObjectSearch this function
 * will only return a single result. If at any point one of the keys is not set it will fallback to the fallbackKey.
 *
 * Example Usage:
 *
 * ```javascript
 * discounts: {
 *   "ALL": {
 *     "ALL": "10%",
 *     "StationA": "15%",
 *     "StationB": "20%",
 *     "StationC": "25%"
 *   },
 *   "StationA": {
 *     "ALL": "30%",
 *     "StationB": "40%"
 *   }
 *   "StationB": {
 *     "ALL": "50%",
 *     "StationA": "60%"
 *   }
 * }
 * ```
 *
 * nestedObjectFind(discounts, "ALL", "StationA", "StationB"); // "40%"
 * nestedObjectFind(discounts, "ALL", "StationC", "StationB"); // "20%"
 * nestedObjectFind(discounts, "ALL", "StationB", "StationC"); // "50%"
 * nestedObjectFind(discounts, "ALL", "StationC", "StationD"); // "10%"
 */
export const nestedObjectFind = (
  obj: any,
  fallbackKey: ObjectKey,
  ...keys: ObjectKey[]
): any | undefined => {
  // find all the results at this search level
  const values = preferentialKeySearch(obj, keys[0], fallbackKey);

  if (values.length > 0) {
    // if this is the last iteration return the values
    if (keys.length === 1) {
      return values[0];
    }
    // otherwise continue to go deeper into the object
    else {
      return nestedObjectFind(values[0], fallbackKey, ...keys.slice(1));
    }
  }
};

/**
 * Flatten an array of arrays into a single array.
 *
 * Example usage:
 *
 * ```javascript
 * const arrays = [
 *   [1, 2, 3],
 *   [2, 3, 4],
 *   [3, 4, 5]
 * ];
 * ```
 *
 * flatten(arrays) //[1, 2, 3, 2, 3, 4, 3, 4, 5];
 */
export const flatten = <T>(arr: T[][]): T[] => {
  return [].concat.apply([], arr);
};

/**
 * Return the cartesian product of the given arrays. Unfortunately accurate type information is not possible until variadic types are implemented.
 *
 * See https://github.com/Microsoft/TypeScript/issues/5453
 *
 * Credit: Edd Mann (http://eddmann.com/posts/cartesian-product-in-javascript/)
 *
 * Example usage:
 *
 * const array1 = [1, 2, 3];
 * const array2 = ["a", "b"];
 * const array3 = [2, 3, 4];
 *
 * product(array1, array2, array3)
 *
 * ```javascript
 * [
 *   [1, "a", 2],
 *   [1, "a", 3],
 *   [1, "a", 4],
 *   [1, "b", 2],
 *   [1, "b", 3],
 *   [1, "b", 4],
 *   [2, "a", 2],
 *   [2, "a", 3],
 *   [2, "a", 4],
 *   [2, "b", 2],
 *   [2, "b", 3],
 *   [2, "b", 4],
 *   [3, "a", 2],
 *   [3, "a", 3],
 *   [3, "a", 4],
 *   [3, "b", 2],
 *   [3, "b", 3],
 *   [3, "b", 4]
 * ]
 * ```
 */
export const product = (...sets: any[][]): any[][] => {
  return sets.reduce(
    (acc, set) => flatten(acc.map(x => set.map(y => [...x, y]))),
    [[]]
  );
};

/**
 * Safely retrieve a nested object property.
 *
 * Example usage:
 *
 * ```javascript
 * const obj = {
 *   type: {
 *     name: {
 *       value: 6
 *     }
 *   }
 * };
 * ```
 *
 * safeGet(obj, "type", "name", "value"); // 6
 * safeGet(obj, "type", "name", "fail"); // undefined
 */
export const safeGet = <T>(obj: any, ...props: ObjectKey[]): T | undefined => {
  return props.length > 1 && obj[props[0]]
    ? safeGet(obj[props[0]], ...props.slice(1))
    : obj[props[0]];
};

export const splitInChunks = (array, sizeChunks = 500) => {
  if (!Array.isArray(array)) {
    array = [array];
  }
  const newArray = [];

  while (array.length) {
    const chunk = array.splice(0, sizeChunks);
    newArray.push(chunk);
  }

  return newArray;
};

export const titleCase = str => {
  if (typeof str !== 'string') return str;
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (!isNaN(parseInt(word.charAt(0), 10))) {
        return (
          word.charAt(0) + word.charAt(1).toUpperCase() + word.substring(2)
        );
      } else {
        return word.charAt(0).toUpperCase() + word.substring(1);
      }
    })
    .join(' ');
};

declare module 'express' {
  interface Request {
    body: any; // Actually should be something like `multer.Body`
    files: any; // Actually should be something like `multer.Files`
  }

  export interface MulterFile {
    key: string; // Available using `S3`.
    path: string; // Available using `DiskStorage`.
    mimetype: string;
    originalname: string;
    size: number;
  }
}
