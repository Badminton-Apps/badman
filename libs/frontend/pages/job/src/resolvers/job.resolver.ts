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
//     const jobId = route.params['id'];

//     return this.apollo
//       .query<{ job: Partial<Club> }>({
//         query: gql`
//           query Club($id: ID!) {
//             job(id: $id) {
//               id
//               name
//               slug
//               fullName
//               abbreviation
//               useForTeamName
//               jobId
//               country
//               state
//             }
//           }
//         `,
//         variables: {
//           id: jobId,
//         },
//       })
//       .pipe(
//         transferState(`jobKey-${jobId}`, this.stateTransfer, this.platformId),
//         map((result) => {
//           if (!result?.data.job) {
//             throw new Error('No job');
//           }
//           return new Club(result.data.job);
//         }),
//         first()
//       );
//   }
// }
