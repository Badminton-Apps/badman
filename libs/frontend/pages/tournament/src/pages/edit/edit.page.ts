import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { HasClaimComponent, PageHeaderComponent } from '@badman/frontend-components';
import { EventTournament } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { TranslatePipe } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { injectParams } from 'ngxtension/inject-params';
import { lastValueFrom } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';
import { TournamentDetailService } from '../detail/detail.service';

export type TournamentEditForm = FormGroup<{
  id: FormControl<string>;
  name: FormControl<string>;
  tournamentNumber: FormControl<number | null>;
  firstDay: FormControl<Date | null>;
  openDate: FormControl<Date | null>;
  closeDate: FormControl<Date | null>;
  visualCode: FormControl<string | null>;
  official: FormControl<boolean>;
  dates: FormControl<string | null>;
  state: FormControl<string | null>;
  country: FormControl<string | null>;
}>;

@Component({
  selector: 'badman-tournament-edit',
  templateUrl: './edit.page.html',
  styleUrls: ['./edit.page.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslatePipe,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatSlideToggleModule,
    MatIconModule,
    MatSnackBarModule,
    PageHeaderComponent,
  ],
})
export class EditPageComponent {
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly seoService = inject(SeoService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly apollo = inject(Apollo);

  private readonly detailService = inject(TournamentDetailService);

  eventTournament = this.detailService.tournament;
  loaded = this.detailService.loaded;
  errors = this.detailService.error;
  private readonly eventId = injectParams('id');  formGroup: TournamentEditForm = new FormGroup({
    id: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    tournamentNumber: new FormControl<number | null>(null),
    firstDay: new FormControl<Date | null>(null),
    openDate: new FormControl<Date | null>(null),
    closeDate: new FormControl<Date | null>(null),
    visualCode: new FormControl<string | null>(null),
    official: new FormControl(false, { nonNullable: true }),
    dates: new FormControl<string | null>(null),
    state: new FormControl<string | null>(null),
    country: new FormControl<string | null>(null),
  });

  isFormValid = computed(() => this.formGroup.valid);

  constructor() {
    effect(() => {
      const eventId = this.eventId();

      if (!eventId) {
        return;
      }

      this.detailService.filter.patchValue({
        tournamentId: eventId,
      });
    });

    effect(() => {
      const tournament = this.eventTournament();
      if (tournament) {
        this.populateForm(tournament);
        this.updateSeoAndBreadcrumbs(tournament);
      }
    });
  }  private populateForm(tournament: EventTournament): void {
    this.formGroup.patchValue({
      id: tournament.id,
      name: tournament.name || '',
      tournamentNumber: tournament.tournamentNumber || null,
      firstDay: tournament.firstDay ? new Date(tournament.firstDay) : null,
      openDate: tournament.openDate ? new Date(tournament.openDate) : null,
      closeDate: tournament.closeDate ? new Date(tournament.closeDate) : null,
      visualCode: tournament.visualCode || null,
      official: tournament.official || false,
      dates: tournament.dates ? tournament.dates.map(d => new Date(d).toISOString()).join(',') : null,
      state: tournament.state || null,
      country: tournament.country || null,
    });
  }

  private updateSeoAndBreadcrumbs(tournament: EventTournament): void {
    const tournamentName = `${tournament.name}`;
    this.seoService.update({
      title: `Edit ${tournamentName}`,
      description: `Edit tournament ${tournamentName}`,
      type: 'website',
      keywords: ['event', 'tournament', 'badminton', 'edit'],
    });
    this.breadcrumbService.set('@eventTournament', tournamentName);
  }

  async save(): Promise<void> {
    if (!this.formGroup.valid) {
      this.snackBar.open('Please fix the form errors', 'Close', { duration: 3000 });
      return;
    }

    const formValue = this.formGroup.value;
    
    try {
      await lastValueFrom(
        this.apollo.mutate<{ updateEventTournament: EventTournament }>({          mutation: gql`
            mutation UpdateEventTournament($data: EventTournamentUpdateInput!) {
              updateEventTournament(data: $data) {
                id
                name
                tournamentNumber
                firstDay
                openDate
                closeDate
                visualCode
                official
                dates
                state
                country
              }
            }
          `,          variables: {
            data: {
              id: formValue.id,
              name: formValue.name,
              tournamentNumber: formValue.tournamentNumber,
              firstDay: formValue.firstDay,
              openDate: formValue.openDate,
              closeDate: formValue.closeDate,
              visualCode: formValue.visualCode,
              official: formValue.official,
              dates: formValue.dates,
              state: formValue.state,
              country: formValue.country,
            },
          },
        }),
      );

      this.snackBar.open('Tournament updated successfully', 'Close', { duration: 3000 });
      
      // Navigate back to tournament detail page
      await this.router.navigate(['/tournament', formValue.id]);
    } catch (error) {
      console.error('Error updating tournament:', error);
      this.snackBar.open('Failed to update tournament', 'Close', { duration: 3000 });
    }
  }

  cancel(): void {
    const tournamentId = this.formGroup.value.id;
    if (tournamentId) {
      this.router.navigate(['/tournament', tournamentId]);
    } else {
      this.router.navigate(['/tournament']);
    }
  }
}
