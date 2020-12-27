import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'levelToLetter',
})
export class LevelToLetterPipe implements PipeTransform {
  transform(value: number): unknown {
    switch (value) {
      case 1:
        return 'A';
      case 2:
        return 'B1';
      case 3:
        return 'B2';
      case 4:
        return 'C1';
      case 5:
        return 'C2';
      case 6:
        return 'D';
    }
  }
}
