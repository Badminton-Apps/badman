import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { EventCompetition } from "@badman/frontend-models";
import { Apollo, gql } from "apollo-angular";
import saveAs from "file-saver";
import { map, take } from "rxjs/operators";
import { EXCEL_CONFIG } from "../excel.module";
import { IExcelConfig } from "../interfaces";
import * as XLSX from "xlsx";

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
                clubId
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
                clubId
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

const EVENT_LOCATIONS_EXPORT_QUERY = gql`
  query EventCompetitionLocationsExport($id: ID!) {
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
                clubId
                locations {
                  id
                  name
                  address
                  street
                  streetNumber
                  postalcode
                  city
                  availabilities {
                    id
                    season
                    days {
                      day
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
  providedIn: "root",
})
export class ExcelService {
  private httpClient = inject(HttpClient);
  private apollo = inject(Apollo);
  private config = inject<IExcelConfig>(EXCEL_CONFIG);

  getBaseplayersEnrollment(event: EventCompetition) {
    if (!event?.id) {
      throw new Error("Event is not defined");
    }

    return this.httpClient
      .get(`${this.config.api}/enrollment`, {
        params: {
          eventId: event.id,
        },
        responseType: "blob",
      })
      .pipe(
        take(1),
        map((result) => saveAs(result, `${event.name}.xlsx`))
      );
  }

  getTeamsExport(event: EventCompetition) {
    if (!event?.id) {
      throw new Error("Event is not defined");
    }

    return this.apollo
      .query<{
        eventCompetition: EventCompetition;
      }>({
        query: EVENT_TEAMS_EXPORT_QUERY,
        variables: { id: event.id },
        fetchPolicy: "no-cache",
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
                    clubId: team.club?.clubId || "",
                    clubName: team.club?.name || "",
                    teamName: team.name || "",
                    preferredDay: team.preferredDay || "",
                    preferredTime: team.preferredTime || "",
                  });
                }
              }
            }
          }

          const data = Array.from(teamsData.values());

          const excelData = [
            [
              "Club ID",
              "Clubnaam",
              "Ploegnaam",
              "Voorkeur speelmoment (dag)",
              "Voorkeur speelmoment (tijdstip)",
            ],
            ...data.map((team) => [
              team.clubId,
              team.clubName,
              team.teamName,
              team.preferredDay || "",
              team.preferredTime || "",
            ]),
          ];

          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.aoa_to_sheet(excelData);

          // Autosize columns
          const columnSizes = excelData[0].map((_, columnIndex) =>
            excelData.reduce(
              (acc, row) => Math.max(acc, (`${row[columnIndex]}`.length ?? 0) + 2),
              0
            )
          );
          ws["!cols"] = columnSizes.map((width) => ({ width }));

          // Enable filtering
          ws["!autofilter"] = {
            ref: XLSX.utils.encode_range(XLSX.utils.decode_range(ws["!ref"] as string)),
          };

          XLSX.utils.book_append_sheet(wb, ws, "Teams");

          const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
          const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });

          saveAs(blob, `${event.name}-teams.xlsx`);
        })
      );
  }

  getExceptionsExport(event: EventCompetition) {
    if (!event?.id) {
      throw new Error("Event is not defined");
    }

    return this.apollo
      .query<{
        eventCompetition: EventCompetition;
      }>({
        query: EVENT_EXCEPTIONS_EXPORT_QUERY,
        variables: { id: event.id },
        fetchPolicy: "no-cache",
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
            date: string;
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
                            // Generate a record for each day between start and end date
                            const dates = this.generateDateRange(exception.start, exception.end);
                            for (const date of dates) {
                              exceptionsData.push({
                                clubId: team.club.clubId || "",
                                clubName: team.club.name || "",
                                locationName: location.name || "",
                                date: this.formatDateToBelgianTime(date),
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
          }

          // Remove duplicates based on clubId, locationName, and date
          const uniqueExceptions = exceptionsData.filter(
            (exception, index, self) =>
              index ===
              self.findIndex(
                (e) =>
                  e.clubId === exception.clubId &&
                  e.locationName === exception.locationName &&
                  e.date === exception.date
              )
          );

          const excelData = [
            ["Club ID", "Clubnaam", "Locatie", "Datum", "Velden"],
            ...uniqueExceptions.map((exception) => [
              exception.clubId,
              exception.clubName,
              exception.locationName,
              exception.date,
              exception.courts,
            ]),
          ];

          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.aoa_to_sheet(excelData);

          // Autosize columns
          const columnSizes = excelData[0].map((_, columnIndex) =>
            excelData.reduce(
              (acc, row) => Math.max(acc, (`${row[columnIndex]}`.length ?? 0) + 2),
              0
            )
          );
          ws["!cols"] = columnSizes.map((width) => ({ width }));

          // Enable filtering
          ws["!autofilter"] = {
            ref: XLSX.utils.encode_range(XLSX.utils.decode_range(ws["!ref"] as string)),
          };

          XLSX.utils.book_append_sheet(wb, ws, "Exceptions");

          const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
          const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });

          saveAs(blob, `${event.name}-exceptions.xlsx`);
        })
      );
  }

  getLocationsExport(event: EventCompetition) {
    if (!event?.id) {
      throw new Error("Event is not defined");
    }

    return this.apollo
      .query<{
        eventCompetition: EventCompetition;
      }>({
        query: EVENT_LOCATIONS_EXPORT_QUERY,
        variables: { id: event.id },
        fetchPolicy: "no-cache",
      })
      .pipe(
        take(1),
        map((result) => {
          const eventData = result.data.eventCompetition;

          // Extract locations data from clubs structure
          const locationsData: Array<{
            clubId: string;
            clubName: string;
            locationName: string;
            address: string;
            day: string;
            courts: number;
          }> = [];

          for (const subEvent of eventData.subEventCompetitions || []) {
            for (const draw of subEvent.drawCompetitions || []) {
              for (const entry of draw.eventEntries || []) {
                const team = entry.team;
                if (team && team.club && team.club.locations) {
                  for (const location of team.club.locations) {
                    // Build address from location fields
                    const addressParts = [
                      location.street,
                      location.streetNumber,
                      location.postalcode,
                      location.city,
                    ].filter(Boolean);
                    const address =
                      addressParts.length > 0 ? addressParts.join(" ") : location.address || "";

                    if (location.availabilities) {
                      for (const availability of location.availabilities) {
                        if (availability.days) {
                          for (const day of availability.days) {
                            if (day.day && day.courts) {
                              locationsData.push({
                                clubId: team.club.clubId || "",
                                clubName: team.club.name || "",
                                locationName: location.name || "",
                                address: address,
                                day: this.formatDayName(day.day),
                                courts: day.courts || 0,
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
          }

          // Remove duplicates based on clubId, locationName, and day
          const uniqueLocations = locationsData.filter(
            (location, index, self) =>
              index ===
              self.findIndex(
                (l) =>
                  l.clubId === location.clubId &&
                  l.locationName === location.locationName &&
                  l.day === location.day
              )
          );

          const excelData = [
            ["Club ID", "Clubnaam", "Locatie", "Adres", "Dag", "Aantal Velden"],
            ...uniqueLocations.map((location) => [
              location.clubId,
              location.clubName,
              location.locationName,
              location.address,
              location.day,
              location.courts,
            ]),
          ];

          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.aoa_to_sheet(excelData);

          // Autosize columns
          const columnSizes = excelData[0].map((_, columnIndex) =>
            excelData.reduce(
              (acc, row) => Math.max(acc, (`${row[columnIndex]}`.length ?? 0) + 2),
              0
            )
          );
          ws["!cols"] = columnSizes.map((width) => ({ width }));

          // Enable filtering
          ws["!autofilter"] = {
            ref: XLSX.utils.encode_range(XLSX.utils.decode_range(ws["!ref"] as string)),
          };

          XLSX.utils.book_append_sheet(wb, ws, "Locations");

          const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
          const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });

          saveAs(blob, `${event.name}-locations.xlsx`);
        })
      );
  }

  private formatDateToBelgianTime(date: string | Date | undefined): string {
    if (!date) return "";

    const dateObj = date instanceof Date ? date : new Date(date);

    // Format to Belgian locale (DD/MM/YYYY)
    return dateObj.toLocaleDateString("nl-BE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Europe/Brussels",
    });
  }

  private formatDayName(day: string): string {
    const dayMap: { [key: string]: string } = {
      monday: "Maandag",
      tuesday: "Dinsdag",
      wednesday: "Woensdag",
      thursday: "Donderdag",
      friday: "Vrijdag",
      saturday: "Zaterdag",
      sunday: "Zondag",
    };
    return dayMap[day.toLowerCase()] || day;
  }

  private generateDateRange(
    startDate: string | Date | undefined,
    endDate: string | Date | undefined
  ): Date[] {
    if (!startDate) return [];

    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate ? (endDate instanceof Date ? endDate : new Date(endDate)) : start;

    const dates: Date[] = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }
}
