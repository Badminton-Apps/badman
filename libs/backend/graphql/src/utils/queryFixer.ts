import { Op } from 'sequelize';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const queryFixer = (input: any) => {
  if (input === null || input === undefined) {
    return input;
  }

  Object.keys(input).forEach((element) => {
    if (typeof input[element] === 'object') {
      input[element] = queryFixer(input[element]);
    }
    if (Object.prototype.hasOwnProperty.call(input, '$adjacent')) {
      input[Op.adjacent] = input.$adjacent;
      delete input.$adjacent;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$all')) {
      input[Op.all] = input.$all;
      delete input.$all;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$and')) {
      input[Op.and] = input.$and;
      delete input.$and;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$any')) {
      input[Op.any] = input.$any;
      delete input.$any;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$between')) {
      input[Op.between] = input.$between;
      delete input.$between;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$col')) {
      input[Op.col] = input.$col;
      delete input.$col;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$contained')) {
      input[Op.contained] = input.$contained;
      delete input.$contained;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$contains')) {
      input[Op.contains] = input.$contains;
      delete input.$contains;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$endsWith')) {
      input[Op.endsWith] = input.$endsWith;
      delete input.$endsWith;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$eq')) {
      input[Op.eq] = input.$eq;
      delete input.$eq;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$gt')) {
      input[Op.gt] = input.$gt;
      delete input.$gt;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$gte')) {
      input[Op.gte] = input.$gte;
      delete input.$gte;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$iLike')) {
      input[Op.iLike] = input.$iLike;
      delete input.$iLike;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$in')) {
      input[Op.in] = input.$in;
      delete input.$in;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$iRegexp')) {
      input[Op.iRegexp] = input.$iRegexp;
      delete input.$iRegexp;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$is')) {
      input[Op.is] = input.$is;
      delete input.$is;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$like')) {
      input[Op.like] = input.$like;
      delete input.$like;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$lt')) {
      input[Op.lt] = input.$lt;
      delete input.$lt;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$lte')) {
      input[Op.lte] = input.$lte;
      delete input.$lte;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$ne')) {
      input[Op.ne] = input.$ne;
      delete input.$ne;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$noExtendLeft')) {
      input[Op.noExtendLeft] = input.$noExtendLef;
      delete input.$noExtendLeft;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$noExtendRight')) {
      input[Op.noExtendRight] = input.$noExtendRight;
      delete input.$noExtendRight;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$not')) {
      input[Op.not] = input.$not;
      delete input.$not;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$notBetween')) {
      input[Op.notBetween] = input.$notBetween;
      delete input.$notBetween;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$notILike')) {
      input[Op.notILike] = input.$notILike;
      delete input.$notILike;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$notIn')) {
      input[Op.notIn] = input.$notIn;
      delete input.$notIn;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$notIRegexp')) {
      input[Op.notIRegexp] = input.$notIRegexp;
      delete input.$notIRegexp;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$notLike')) {
      input[Op.notLike] = input.$notLike;
      delete input.$notLike;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$notRegexp')) {
      input[Op.notRegexp] = input.$notRegexp;
      delete input.$notRegexp;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$or')) {
      input[Op.or] = input.$or;
      delete input.$or;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$overlap')) {
      input[Op.overlap] = input.$overlap;
      delete input.$overlap;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$placeholder')) {
      input[Op.placeholder] = input.$placeholder;

      delete input.$placeholder;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$regexp')) {
      input[Op.regexp] = input.$regexp;
      delete input.$regexp;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$startsWith')) {
      input[Op.startsWith] = input.$startsWith;
      delete input.$startsWith;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$strictLeft')) {
      input[Op.strictLeft] = input.$strictLeft;
      delete input.$strictLeft;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$strictRight')) {
      input[Op.strictRight] = input.$strictRight;
      delete input.$strictRight;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$substring')) {
      input[Op.substring] = input.$substring;
      delete input.$substring;
    }
    if (Object.prototype.hasOwnProperty.call(input, '$values')) {
      input[Op.values] = input.$values;
      delete input.$values;
    }
  });

  return input;
};
