
import { Component, OnInit, effect, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import {
  AddEventComponent,
  HasClaimComponent,
  PageHeaderComponent,
  SelectSeasonComponent,
} from '@badman/frontend-components';
import { JobsService } from '@badman/frontend-queue';
import { SeoService } from '@badman/frontend-seo';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
import { lastValueFrom } from 'rxjs';
import { BreadcrumbService } from 'xng-breadcrumb';
import { CompetitionEventsComponent } from './competition-events/competition-events.component';
import { EventOverviewService } from './overview.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { DateAdapter } from '@angular/material/core';
import { Apollo, gql } from 'apollo-angular';
import { Location } from '@badman/frontend-models';
import saveAs from 'file-saver';

@Component({
  selector: 'badman-competition-overview',
  templateUrl: './overview.page.html',
  styleUrls: ['./overview.page.scss'],
  imports: [
    RouterModule,
    TranslatePipe,
    ReactiveFormsModule,
    MomentModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatDialogModule,
    PageHeaderComponent,
    HasClaimComponent,
    CompetitionEventsComponent,
    SelectSeasonComponent
],
})
export class OverviewPageComponent implements OnInit {
  private readonly translate = inject(TranslateService);
  private readonly seoService = inject(SeoService);
  private readonly breadcrumbsService = inject(BreadcrumbService);
  private readonly jobsService = inject(JobsService);
  private readonly dialog = inject(MatDialog);
  private readonly apollo = inject(Apollo);

  eventService = inject(EventOverviewService);

  filter = this.eventService.filter;

  private readonly _adapter = inject<DateAdapter<unknown, unknown>>(DateAdapter);

  ngOnInit(): void {
    this.translate.get(['all.competition.title']).subscribe((translations) => {
      this.seoService.update({
        title: translations['all.competition.title'],
        description: translations['all.competition.title'],
        type: 'website',
        keywords: ['event', 'competition', 'badminton'],
      });
      this.breadcrumbsService.set('competition', translations['all.competition.title']);
    });
  }

  async addEvent() {
    const dialogRef = this.dialog.open(AddEventComponent, {
      width: '400px',
    });

    const result = await lastValueFrom(dialogRef.afterClosed());

    if (result?.id) {
      await lastValueFrom(this.jobsService.syncEventById(result));
    }
  }

  async exportPlanner() {
    const season = this.filter.get('season')?.value;
    if (!season) {
      return;
    }

    const result = await lastValueFrom(
      this.apollo.query<{
        eventCompetitions: {
          rows: {
            id: string;
            name: string;
            subEventCompetitions: {
              id: string;
              name: string;
              drawCompetitions: {
                id: string;
                name: string;
                eventEntries: {
                  team: {
                    id: string;
                    name: string;
                    teamNumber: number;
                    type: string;
                    preferredDay: string;
                    preferredTime: string;
                    club: {
                      id: string;
                      name: string;
                      locations: Location[];
                    };
                  };
                }[];
              }[];
            }[];
          }[];
        };
      }>({
        query: gql`
          query ExportPlannerData($where: JSONObject) {
            eventCompetitions(where: $where) {
              rows {
                id
                name
                subEventCompetitions {
                  id
                  name
                  drawCompetitions {
                    id
                    name
                    eventEntries {
                      team {
                        id
                        name
                        teamNumber
                        type
                        preferredDay
                        preferredTime
                        club {
                          id
                          name
                          locations {
                            id
                            name
                            address
                            street
                            streetNumber
                            postalcode
                            city
                            state
                            availabilities {
                              id
                              days {
                                day
                                startTime
                                endTime
                                courts
                              }
                              exceptions {
                                start
                                end
                                courts
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          where: {
            season,
          },
        },
      }),
    );

    interface PlannerTeam {
      id: string;
      name: string;
      event: { id: string; name: string };
      subEvent: { id: string; name: string };
      draw: { id: string; name: string };
      preferredDay: string;
      preferredTime: string;
      teamNumber: number;
      type: string;
    }

    interface PlannerLocation {
      id: string;
      name: string;
      address: string;
      street: string;
      streetNumber: string;
      postalcode: string;
      city: string;
      state: string;
      availabilities: unknown[];
    }

    const planner: {
      [key: string]: {
        name: string;
        locations: PlannerLocation[];
        teams: PlannerTeam[];
      };
    } = {};

    for (const event of result.data.eventCompetitions.rows) {
      for (const subEvent of event.subEventCompetitions) {
        for (const draw of subEvent.drawCompetitions) {
          for (const entry of draw.eventEntries) {
            if (!entry.team?.club) {
              continue;
            }

            if (!planner[entry.team.club.id]) {
              planner[entry.team.club.id] = {
                name: entry.team.club.name,
                locations:
                  entry.team.club.locations?.map((l) => ({
                    id: l.id || '',
                    name: l.name || '',
                    address: l.address || '',
                    street: l.street || '',
                    streetNumber: l.streetNumber || '',
                    postalcode: l.postalcode || '',
                    city: l.city || '',
                    state: l.state || '',
                    availabilities: l.availabilities?.map((a) => ({
                      id: a.id,
                      days: a.days,
                      exceptions: a.exceptions,
                    })) ?? [],
                  })) ?? [],
                teams: [],
              };
            }

            if (!planner[entry.team.club.id].teams.find((t) => t.id === entry.team.id)) {
              planner[entry.team.club.id].teams.push({
                id: entry.team.id,
                name: entry.team.name,
                event: {
                  id: event.id,
                  name: event.name,
                },
                subEvent: {
                  id: subEvent.id,
                  name: subEvent.name,
                },
                draw: {
                  id: draw.id,
                  name: draw.name,
                },
                preferredDay: entry.team.preferredDay,
                preferredTime: entry.team.preferredTime,
                teamNumber: entry.team.teamNumber,
                type: entry.team.type,
              });
            }
          }
        }
      }
    }

    // download the file
    const blob = new Blob([JSON.stringify(Object.values(planner), null, 2)], {
      type: 'application/json',
    });
    saveAs(blob, `competition-planner-${season}.json`);
  }
}
