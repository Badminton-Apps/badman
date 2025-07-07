import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EventCompetition } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import saveAs from 'file-saver';
import { map, take } from 'rxjs/operators';
import { EXCEL_CONFIG } from '../excel.module';
import { IExcelConfig } from '../interfaces';
import * as XLSX from 'xlsx';

const EVENT_TEAMS_EXPORT_QUERY = gql`
  query EventCompetitionTeamsExport($id: ID!) {
    eventCompetition(id: $id) {
      id
      name
      subEventCompetitions {
        id
        drawCompetitions {
          id
          eventEntries {
            id
            team {
              id
              name
              preferredDay
              preferredTime
              club {
                id
                name
              }
            }
          }
        }
      }
    }
  }
`;

const EVENT_EXCEPTIONS_EXPORT_QUERY = gql`
  query EventCompetitionExceptionsExport($id: ID!) {
    eventCompetition(id: $id) {
      id
      name
      subEventCompetitions {
        id
        drawCompetitions {
          id
          eventEntries {
            id
            team {
              id
              club {
                id
                name
                locations {
                  id
                  name
                  availabilities {
                    id
                    season
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
`;

interface TeamExportData {
  clubId: string;
  clubName: string;
  teamName: string;
  preferredDay: string;
  preferredTime: string;
}

@Injectable({
  providedIn: 'root',
})
export class ExcelService {
  private httpClient = inject(HttpClient);
  private apollo = inject(Apollo);
  private config = inject<IExcelConfig>(EXCEL_CONFIG);

  getBaseplayersEnrollment(event: EventCompetition) {
    if (!event?.id) {
      throw new Error('Event is not defined');
    }

    return this.httpClient
      .get(`${this.config.api}/enrollment`, {
        params: {
          eventId: event.id,
        },
        responseType: 'blob',
      })
      .pipe(
        take(1),
        map((result) => saveAs(result, `${event.name}.xlsx`)),
      );
  }

  getTeamsExport(event: EventCompetition) {
    if (!event?.id) {
      throw new Error('Event is not defined');
    }

    return this.apollo
      .query<{
        eventCompetition: EventCompetition;
      }>({
        query: EVENT_TEAMS_EXPORT_QUERY,
        variables: { id: event.id },
        fetchPolicy: 'no-cache',
      })
      .pipe(
        take(1),
        map((result) => {
          const eventData = result.data.eventCompetition;
          
          // Extract teams data from the event structure
          const teamsData = new Map<string, TeamExportData>();
          
          for (const subEvent of eventData.subEventCompetitions || []) {
            for (const draw of subEvent.drawCompetitions || []) {
              for (const entry of draw.eventEntries || []) {
                const team = entry.team;
                if (team && !teamsData.has(team.id)) {
                  teamsData.set(team.id, {
                    clubId: team.club?.id || '',
                    clubName: team.club?.name || '',
                    teamName: team.name || '',
                    preferredDay: team.preferredDay || '',
                    preferredTime: team.preferredTime || '',
                  });
                }
              }
            }
          }

          const data = Array.from(teamsData.values());
          
          const excelData = [
            ['Club ID', 'Clubnaam', 'Ploegnaam', 'Voorkeur speelmoment (dag)', 'Voorkeur speelmoment (tijdstip)'],
            ...data.map(team => [
              team.clubId,
              team.clubName,
              team.teamName,
              team.preferredDay || '',
              team.preferredTime || ''
            ])
          ];

          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.aoa_to_sheet(excelData);

          // Autosize columns
          const columnSizes = excelData[0].map((_, columnIndex) =>
            excelData.reduce((acc, row) => Math.max(acc, (`${row[columnIndex]}`.length ?? 0) + 2), 0),
          );
          ws['!cols'] = columnSizes.map((width) => ({ width }));

          // Enable filtering
          ws['!autofilter'] = {
            ref: XLSX.utils.encode_range(XLSX.utils.decode_range(ws['!ref'] as string)),
          };

          XLSX.utils.book_append_sheet(wb, ws, 'Teams');

          const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          
          saveAs(blob, `${event.name}-teams.xlsx`);
        }),
      );
  }

  getExceptionsExport(event: EventCompetition) {
    if (!event?.id) {
      throw new Error('Event is not defined');
    }

    return this.apollo
      .query<{
        eventCompetition: EventCompetition;
      }>({
        query: EVENT_EXCEPTIONS_EXPORT_QUERY,
        variables: { id: event.id },
        fetchPolicy: 'no-cache',
      })
      .pipe(
        take(1),
        map((result) => {
          const eventData = result.data.eventCompetition;
          
          // Extract exceptions data from clubs/locations/availabilities structure
          const exceptionsData: Array<{
            clubId: string;
            clubName: string;
            locationName: string;
            startDate: string;
            endDate: string;
            courts: number;
          }> = [];
          
          for (const subEvent of eventData.subEventCompetitions || []) {
            for (const draw of subEvent.drawCompetitions || []) {
              for (const entry of draw.eventEntries || []) {
                const team = entry.team;
                if (team && team.club && team.club.locations) {
                  for (const location of team.club.locations) {
                    if (location.availabilities) {
                      for (const availability of location.availabilities) {
                        if (availability.exceptions) {
                          for (const exception of availability.exceptions) {
                            exceptionsData.push({
                              clubId: team.club.id || '',
                              clubName: team.club.name || '',
                              locationName: location.name || '',
                              startDate: this.formatDateToBelgianTime(exception.start),
                              endDate: this.formatDateToBelgianTime(exception.end),
                              courts: exception.courts || 0,
                            });
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          // Remove duplicates based on clubId, locationName, and startDate
          const uniqueExceptions = exceptionsData.filter((exception, index, self) =>
            index === self.findIndex(e => 
              e.clubId === exception.clubId && 
              e.locationName === exception.locationName && 
              e.startDate === exception.startDate && 
              e.endDate === exception.endDate
            )
          );
          
          const excelData = [
            ['Club ID', 'Clubnaam', 'Locatie', 'Startdatum', 'Einddatum', 'Velden'],
            ...uniqueExceptions.map(exception => [
              exception.clubId,
              exception.clubName,
              exception.locationName,
              exception.startDate,
              exception.endDate,
              exception.courts
            ])
          ];

          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.aoa_to_sheet(excelData);

          // Autosize columns
          const columnSizes = excelData[0].map((_, columnIndex) =>
            excelData.reduce((acc, row) => Math.max(acc, (`${row[columnIndex]}`.length ?? 0) + 2), 0),
          );
          ws['!cols'] = columnSizes.map((width) => ({ width }));

          // Enable filtering
          ws['!autofilter'] = {
            ref: XLSX.utils.encode_range(XLSX.utils.decode_range(ws['!ref'] as string)),
          };

          XLSX.utils.book_append_sheet(wb, ws, 'Exceptions');

          const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          
          saveAs(blob, `${event.name}-exceptions.xlsx`);
        }),
      );
  }

  private formatDateToBelgianTime(date: string | Date | undefined): string {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Format to Belgian locale (DD/MM/YYYY)
    return dateObj.toLocaleDateString('nl-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Brussels'
    });
  }
}
