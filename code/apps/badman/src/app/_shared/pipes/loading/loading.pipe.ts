import { Pipe, PipeTransform } from '@angular/core';
import { isObservable, of } from 'rxjs';
import { map, startWith, catchError } from 'rxjs/operators';

@Pipe({
  name: 'loading',
})
export class LoadingPipe implements PipeTransform {
  transform(val: string) {
    return isObservable(val)
      ? val.pipe(
          map((value: any) => ({ loading: false, value })),
          startWith({ loading: true, value: null }),
          catchError((error) => of({ loading: false, error }))
        )
      : val;
  }
}
