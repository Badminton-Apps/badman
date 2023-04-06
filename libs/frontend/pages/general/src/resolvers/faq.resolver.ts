import { isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { Resolve } from '@angular/router';
import { Faq } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { of } from 'rxjs';
import { first, map, tap } from 'rxjs/operators';

@Injectable()
export class FaqResolver implements Resolve<Faq[]> {
  constructor(
    private apollo: Apollo,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: string
  ) {}

  resolve() {
    const STATE_KEY = makeStateKey<Faq[]>('faqsKey');

    if (this.transferState.hasKey(STATE_KEY)) {
      const faqs = this.transferState.get(STATE_KEY, null) as Partial<Faq[]>;

      this.transferState.remove(STATE_KEY);

      if (faqs && faqs.length > 0) {
        return of(
          faqs
            ?.filter((faq) => faq?.id != null && faq?.id != undefined)
            ?.map((faq) => {
              return new Faq(faq as Faq);
            })
        );
      }

      return of();
    } else {
      return this.apollo
        .query<{ faqs: Partial<Faq>[] }>({
          query: gql`
            query Faqs {
              faqs {
                id
                question
                answer
              }
            }
          `,
        })
        .pipe(
          map((result) => {
            if (!result.data.faqs) {
              throw new Error('No faq');
            }
            return result.data.faqs.map((faq) => new Faq(faq));
          }),
          first(),
          tap((faqs) => {
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(STATE_KEY, faqs);
            }
          })
        );
    }
  }
}
