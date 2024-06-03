import { Injectable, PLATFORM_ID, TransferState, inject } from '@angular/core';
import { Faq } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { first, map } from 'rxjs/operators';

@Injectable()
export class FaqResolver {
  private apollo = inject(Apollo);
  private stateTransfer = inject(TransferState);
  private platformId = inject<string>(PLATFORM_ID);

  resolve() {
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
        transferState(`faqsKey`, this.stateTransfer, this.platformId),
        map((result) => {
          if (!result?.data.faqs) {
            throw new Error('No faq');
          }
          return result.data.faqs.map((faq) => new Faq(faq));
        }),
        first(),
      );
  }
}
