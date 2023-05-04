import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PageHeaderComponent } from '@badman/frontend-components';
import { EventCompetition, SubEventCompetition } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';
import { EventCompetitionLevelFieldsComponent } from './components';

@Component({
  selector: 'badman-competition-edit',
  templateUrl: './edit.page.html',
  styleUrls: ['./edit.page.scss'],
  standalone: true,
  imports: [
    // Core modules
    CommonModule,
    RouterModule,
    TranslateModule,

    // Material Modules
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule,
    ReactiveFormsModule,

    // Own modules
    PageHeaderComponent,
    EventCompetitionLevelFieldsComponent,
  ],
})
export class EditPageComponent implements OnInit {
  eventCompetition!: EventCompetition;
  
  update$ = new BehaviorSubject(0);
  saved$ = new BehaviorSubject(0);

  formGroup: FormGroup = new FormGroup({});

  constructor(
    private seoService: SeoService,
    private route: ActivatedRoute,
    private router: Router,
    private breadcrumbsService: BreadcrumbService,
    private apollo: Apollo,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.eventCompetition = data['eventCompetition'];
  
      const eventCompetitionName = `${this.eventCompetition.name}`;
  
      this.seoService.update({
        title: eventCompetitionName,
        description: `Competition ${eventCompetitionName}`,
        type: 'website',
        keywords: ['event', 'competition', 'badminton'],
      });
      this.breadcrumbsService.set('@eventCompetition', eventCompetitionName);

      this.setupFormGroup(this.eventCompetition);
    });
  }

  private setupFormGroup(event: EventCompetition) {
    this.formGroup = new FormGroup({
      name: new FormControl(event.name, Validators.required),
      type: new FormControl(event.type, Validators.required),
      season: new FormControl(event.season, [
        Validators.required,
        Validators.min(2000),
        Validators.max(3000),
      ]),

      usedRankingUnit: new FormControl(event.usedRankingUnit, [
        Validators.required,
      ]),
      usedRankingAmount: new FormControl(event.usedRankingAmount, [
        Validators.required,
        Validators.min(1),
        Validators.max(52),
      ]),

      subEvents: new FormArray(
        event.subEventCompetitions?.map((subEvent) => {
          return new FormGroup({
            id: new FormControl(subEvent.id),
            name: new FormControl(subEvent.name, Validators.required),
            level: new FormControl(subEvent.level, Validators.required),
            eventType: new FormControl(subEvent.eventType, Validators.required),
            maxLevel: new FormControl(subEvent.maxLevel, Validators.required),
            minBaseIndex: new FormControl(subEvent.minBaseIndex),
            maxBaseIndex: new FormControl(subEvent.maxBaseIndex),
          });
        }) ?? []
      ),
    });
  }


  async copy(templateRef: TemplateRef<object>) {
    this.dialog
      .open(templateRef, {
        width: '300px',
      })
      .afterClosed()
      .subscribe((r) => {
        if (r) {
          this.apollo
            .mutate<{ copyEventCompetition: Partial<EventCompetition> }>({
              mutation: gql`
                mutation CopyEventCompetition($id: ID!, $year: Int!) {
                  copyEventCompetition(id: $id, year: $year) {
                    id
                    slug
                  }
                }
              `,
              variables: {
                id: this.eventCompetition.id,
                year: r,
              },
            })
            .subscribe((r) => {
              this.router.navigate([
                '/competition',
                r.data?.copyEventCompetition?.slug,
              ]);
            });
        }
      });
  }
}
