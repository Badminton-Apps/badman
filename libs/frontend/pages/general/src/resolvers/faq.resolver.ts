import { Inject, Injectable, PLATFORM_ID, TransferState } from '@angular/core';
import { Faq } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { Apollo, gql } from 'apollo-angular';
import { first, map } from 'rxjs/operators';

@Injectable()
export class FaqResolver {
  constructor(
    private apollo: Apollo,
    private stateTransfer: TransferState,
    @Inject(PLATFORM_ID) private platformId: string,
  ) {}

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
