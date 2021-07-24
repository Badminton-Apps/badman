import { Op } from 'sequelize';

export const queryFixer = input => {
  if (input == null || input == undefined){
    return input;
  }

  Object.keys(input).forEach(element => {
    if (typeof input[element] == 'object') {
      input[element] = queryFixer(input[element]);
    }
    if (input.hasOwnProperty('$adjacent')) {
      input[Op.adjacent] = input.$adjacent;
      delete input.$adjacent;
    }
    if (input.hasOwnProperty('$all')) {
      input[Op.all] = input.$all;
      delete input.$all;
    }
    if (input.hasOwnProperty('$and')) {
      input[Op.and] = input.$and;
      delete input.$and;
    }
    if (input.hasOwnProperty('$any')) {
      input[Op.any] = input.$any;
      delete input.$any;
    }
    if (input.hasOwnProperty('$between')) {
      input[Op.between] = input.$between;
      delete input.$between;
    }
    if (input.hasOwnProperty('$col')) {
      input[Op.col] = input.$col;
      delete input.$col;
    }
    if (input.hasOwnProperty('$contained')) {
      input[Op.contained] = input.$contained;
      delete input.$contained;
    }
    if (input.hasOwnProperty('$contains')) {
      input[Op.contains] = input.$contains;
      delete input.$contains;
    }
    if (input.hasOwnProperty('$endsWith')) {
      input[Op.endsWith] = input.$endsWith;
      delete input.$endsWith;
    }
    if (input.hasOwnProperty('$eq')) {
      input[Op.eq] = input.$eq;
      delete input.$eq;
    }
    if (input.hasOwnProperty('$gt')) {
      input[Op.gt] = input.$gt;
      delete input.$gt;
    }
    if (input.hasOwnProperty('$gte')) {
      input[Op.gte] = input.$gte;
      delete input.$gte;
    }
    if (input.hasOwnProperty('$iLike')) {
      input[Op.iLike] = input.$iLike;
      delete input.$iLike;
    }
    if (input.hasOwnProperty('$in')) {
      input[Op.in] = input.$in;
      delete input.$in;
    }
    if (input.hasOwnProperty('$iRegexp')) {
      input[Op.iRegexp] = input.$iRegexp;
      delete input.$iRegexp;
    }
    if (input.hasOwnProperty('$is')) {
      input[Op.is] = input.$is;
      delete input.$is;
    }
    if (input.hasOwnProperty('$like')) {
      input[Op.like] = input.$like;
      delete input.$like;
    }
    if (input.hasOwnProperty('$lt')) {
      input[Op.lt] = input.$lt;
      delete input.$lt;
    }
    if (input.hasOwnProperty('$lte')) {
      input[Op.lte] = input.$lte;
      delete input.$lte;
    }
    if (input.hasOwnProperty('$ne')) {
      input[Op.ne] = input.$ne;
      delete input.$ne;
    }
    if (input.hasOwnProperty('$noExtendLeft')) {
      input[Op.noExtendLeft] = input.$noExtendLef;
      delete input.$noExtendLeft;
    }
    if (input.hasOwnProperty('$noExtendRight')) {
      input[Op.noExtendRight] = input.$noExtendRight;
      delete input.$noExtendRight;
    }
    if (input.hasOwnProperty('$not')) {
      input[Op.not] = input.$not;
      delete input.$not;
    }
    if (input.hasOwnProperty('$notBetween')) {
      input[Op.notBetween] = input.$notBetween;
      delete input.$notBetween;
    }
    if (input.hasOwnProperty('$notILike')) {
      input[Op.notILike] = input.$notILike;
      delete input.$notILike;
    }
    if (input.hasOwnProperty('$notIn')) {
      input[Op.notIn] = input.$notIn;
      delete input.$notIn;
    }
    if (input.hasOwnProperty('$notIRegexp')) {
      input[Op.notIRegexp] = input.$notIRegexp;
      delete input.$notIRegexp;
    }
    if (input.hasOwnProperty('$notLike')) {
      input[Op.notLike] = input.$notLike;
      delete input.$notLike;
    }
    if (input.hasOwnProperty('$notRegexp')) {
      input[Op.notRegexp] = input.$notRegexp;
      delete input.$notRegexp;
    }
    if (input.hasOwnProperty('$or')) {
      input[Op.or] = input.$or;
      delete input.$or;
    }
    if (input.hasOwnProperty('$overlap')) {
      input[Op.overlap] = input.$overlap;
      delete input.$overlap;
    }
    if (input.hasOwnProperty('$placeholder')) {
      input[Op.placeholder] = input.$placeholder;

      delete input.$placeholder;
    }
    if (input.hasOwnProperty('$regexp')) {
      input[Op.regexp] = input.$regexp;
      delete input.$regexp;
    }
    if (input.hasOwnProperty('$startsWith')) {
      input[Op.startsWith] = input.$startsWith;
      delete input.$startsWith;
    }
    if (input.hasOwnProperty('$strictLeft')) {
      input[Op.strictLeft] = input.$strictLeft;
      delete input.$strictLeft;
    }
    if (input.hasOwnProperty('$strictRight')) {
      input[Op.strictRight] = input.$strictRight;
      delete input.$strictRight;
    }
    if (input.hasOwnProperty('$substring')) {
      input[Op.substring] = input.$substring;
      delete input.$substring;
    }
    if (input.hasOwnProperty('$values')) {
      input[Op.values] = input.$values;
      delete input.$values;
    }
  });

  return input;
};
