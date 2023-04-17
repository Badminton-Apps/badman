import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import {
  SelectClubComponent,
  SelectEncounterComponent,
  SelectTeamComponent,
} from '@badman/frontend-components';
import { RankingSystemService } from '@badman/frontend-graphql';
import { EncounterCompetition, Player } from '@badman/frontend-models';
import { PdfService } from '@badman/frontend-pdf';
import { SeoService } from '@badman/frontend-seo';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import {  lastValueFrom } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { AssemblyComponent } from './components';
import { AuthenticateService } from '@badman/frontend-auth';

@Component({
  selector: 'badman-assembly-create',
  templateUrl: './create.page.html',
  styleUrls: ['./create.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectClubComponent,
    SelectTeamComponent,
    SelectEncounterComponent,

    TranslateModule,

    MatIconModule,
    MatButtonModule,
    AssemblyComponent,
    MatDialogModule,
    MatMenuModule,
    MatRippleModule,
  ],
})
export class CreatePageComponent implements OnInit {
  formGroup: FormGroup = new FormGroup({});
  selectedEventControl: FormControl = new FormControl();
  pdfLoading = false;
  saveLoading = false;

  @ViewChild('validationWarnings')
  validationWarnings?: TemplateRef<HTMLElement>;

  validationOverview?: {
    valid: boolean;
    template: TemplateRef<HTMLElement>;
  };

  constructor(
    private seoService: SeoService,
    private route: ActivatedRoute,
    private apollo: Apollo,
    private systemService: RankingSystemService,
    private pdfService: PdfService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    public authenticate: AuthenticateService
  ) {}

  ngOnInit(): void {
    this.seoService.update({
      title: `Create assembly`,
      description: `Create assembly`,
      type: 'website',
      keywords: ['assembly', 'badminton'],
    });
    // Set for today
    const today = moment();
    const queryYear = parseInt(this.route.snapshot.queryParams['year'], 10);
    const year = isNaN(queryYear)
      ? today.month() >= 6
        ? today.year()
        : today.year() - 1
      : queryYear;

    this.formGroup.addControl('year', new FormControl(year));
    this.formGroup.addControl('event', this.selectedEventControl);
    this.formGroup.addControl('club', new FormControl());
  }

  encounterSelected(encounter: EncounterCompetition) {
    this.selectedEventControl?.setValue(encounter);
  }

  templateUpdated(template: {
    valid: boolean;
    template: TemplateRef<HTMLElement>;
  }) {
    this.validationOverview = template;
  }

  async download() {
    if (!this.validationOverview?.valid) {
      if (!this.validationOverview || !this.validationWarnings) {
        return;
      }
      this.dialog
        .open(this.validationWarnings)
        .afterClosed()
        .subscribe(async (confirmed) => {
          if (confirmed) {
            await this.getPdf();
          }
        });
    } else {
      await this.getPdf();
    }
  }

  async getPdf() {
    // Mark as downloading
    this.pdfLoading = true;

    // Auto reeset after 5 seconds
    setTimeout(() => {
      this.pdfLoading = false;
    }, 5000);

    // Get info
    const encounterId = this.formGroup.get('encounter')?.value;
    const result = await lastValueFrom(
      this.apollo.query<{
        encounterCompetition: Partial<EncounterCompetition>;
      }>({
        query: gql`
          query GetEncounterQuery($id: ID!) {
            encounterCompetition(id: $id) {
              id
              home {
                id
                name
              }
              away {
                id
                name
              }
            }
          }
        `,
        variables: {
          id: encounterId,
        },
      })
    );

    const encounter = new EncounterCompetition(
      result.data.encounterCompetition
    );
    const fileName = `${moment(encounter?.date).format('YYYY-MM-DD HH:mm')} - ${
      encounter?.home?.name
    } vs ${encounter?.away?.name}.pdf`;

    // Generate pdf
    this.systemService
      .getPrimarySystemId()
      .pipe(
        switchMap((systemId) => {
          if (!systemId) {
            throw new Error('No system found');
          }

          return this.pdfService.getTeamAssembly({
            systemId,
            captainId: this.formGroup.get('captain')?.value,
            teamId: this.formGroup.get('team')?.value,
            encounterId: encounterId,

            single1: this.formGroup.get('single1')?.value?.id,
            single2: this.formGroup.get('single2')?.value?.id,
            single3: this.formGroup.get('single3')?.value?.id,
            single4: this.formGroup.get('single4')?.value?.id,

            double1: this.formGroup
              .get('double1')
              ?.value?.map((r: Player) => r.id),
            double2: this.formGroup
              .get('double2')
              ?.value?.map((r: Player) => r.id),
            double3: this.formGroup
              .get('double3')
              ?.value?.map((r: Player) => r.id),
            double4: this.formGroup
              .get('double4')
              ?.value?.map((r: Player) => r.id),

            subtitudes: this.formGroup
              .get('subtitudes')
              ?.value?.map((r: Player) => r.id),
          });
        })
      )
      .subscribe((pdf) => {
        const url = window.URL.createObjectURL(pdf);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.setAttribute('download', fileName);
        downloadLink.click();

        // Reset loading
        this.pdfLoading = false;
      });
  }

  async save() {
    this.saveLoading = true;
    try {
      if (!this.validationOverview?.valid) {
        if (!this.validationOverview || !this.validationWarnings) {
          return;
        }
        this.dialog
          .open(this.validationWarnings)
          .afterClosed()
          .subscribe(async (confirmed) => {
            if (confirmed) {
              await lastValueFrom(this.saveAssembly());
            }
          });
      } else {
        await lastValueFrom(this.saveAssembly());
      }

      this.snackBar.open('Saved', undefined, {
        duration: 2000,
        panelClass: 'success',
      });
    } catch (e) {
      this.snackBar.open('Failed to save', undefined, {
        duration: 2000,
        panelClass: 'error',
      });
    } finally {
      this.saveLoading = false;
    }
  }

  private saveAssembly() {
    return this.systemService.getPrimarySystemId().pipe(
      switchMap((systemId) => {
        if (!systemId) {
          throw new Error('No system found');
        }

        return this.apollo.mutate({
          mutation: gql`
            mutation CreateAssemblyMutation($assembly: AssemblyInput!) {
              createAssembly(assembly: $assembly)
            }
          `,
          variables: {
            assembly: {
              systemId,
              captainId: this.formGroup.get('captain')?.value,
              teamId: this.formGroup.get('team')?.value,
              encounterId: this.formGroup.get('encounter')?.value,

              single1: this.formGroup.get('single1')?.value?.id,
              single2: this.formGroup.get('single2')?.value?.id,
              single3: this.formGroup.get('single3')?.value?.id,
              single4: this.formGroup.get('single4')?.value?.id,

              double1: this.formGroup
                .get('double1')
                ?.value?.map((r: Player) => r.id),
              double2: this.formGroup
                .get('double2')
                ?.value?.map((r: Player) => r.id),
              double3: this.formGroup
                .get('double3')
                ?.value?.map((r: Player) => r.id),
              double4: this.formGroup
                .get('double4')
                ?.value?.map((r: Player) => r.id),

              subtitudes: this.formGroup
                .get('subtitudes')
                ?.value?.map((r: Player) => r.id),
            },
          },
        });
      }),
      take(1)
    );
  }
}
