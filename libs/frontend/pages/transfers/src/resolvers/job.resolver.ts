// import { Inject, Injectable, PLATFORM_ID, TransferState } from '@angular/core';
// import { ActivatedRouteSnapshot } from '@angular/router';
// import { Club } from '@badman/frontend-models';
// import { transferState } from '@badman/frontend-utils';
// import { Apollo, gql } from 'apollo-angular';
// import { first, map } from 'rxjs/operators';

// @Injectable()
// export class ClubResolver {
//   constructor(
//     private apollo: Apollo,
//     private stateTransfer: TransferState,
//     @Inject(PLATFORM_ID) private platformId: string
//   ) {}

//   resolve(route: ActivatedRouteSnapshot) {
//     const transferId = route.params['id'];

//     return this.apollo
//       .query<{ transfer: Partial<Club> }>({
//         query: gql`
//           query Club($id: ID!) {
//             transfer(id: $id) {
//               id
//               name
//               slug
//               fullName
//               abbreviation
//               useForTeamName
//               transferId
//               country
//               state
//             }
//           }
//         `,
//         variables: {
//           id: transferId,
//         },
//       })
//       .pipe(
//         transferState(`transferKey-${transferId}`, this.stateTransfer, this.platformId),
//         map((result) => {
//           if (!result?.data.transfer) {
//             throw new Error('No transfer');
//           }
//           return new Club(result.data.transfer);
//         }),
//         first()
//       );
//   }
// }
