import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'enumToArray' })
export class EnumToArrayPipe implements PipeTransform {
  transform(value): Object {
    return Object.keys(value);
  }
}
