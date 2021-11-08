import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { LocationDialogComponent } from 'app/club/dialogs/location-dialog/location-dialog.component';
import {
  AuthService,
  Club,
  ClubService,
  EventService,
  Location,
  LocationService,
  Player,
  Role,
  RoleService,
  Team,
  TeamService,
} from 'app/_shared';
import { BehaviorSubject, combineLatest, Observable, lastValueFrom } from 'rxjs';
import { debounceTime, filter, map, switchMap } from 'rxjs/operators';

@Component({
  templateUrl: './edit-club.component.html',
  styleUrls: ['./edit-club.component.scss'],
})
export class EditClubComponent implements OnInit {
  club$!: Observable<Club>;
  roles$!: Observable<Role[]>;
  locations$!: Observable<Location[]>;

  compYears$?: Observable<(number | undefined)[]>;
  teamsForYear$!: Observable<Team[]>;

  updateClub$ = new BehaviorSubject(null);
  updateLocation$ = new BehaviorSubject(null);
  updateRoles$ = new BehaviorSubject(null);

  competitionYear = new FormControl();

  constructor(
    private authService: AuthService,
    private teamService: TeamService,
    private roleService: RoleService,
    private clubService: ClubService,
    private eventService: EventService,
    private locationService: LocationService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const clubid$ = this.route.paramMap.pipe(map((params) => params.get('id')));

    this.compYears$ = combineLatest([
      clubid$,
      this.authService.userPermissions$,
      this.updateClub$.pipe(debounceTime(600)),
    ]).pipe(switchMap(([id]) => this.clubService.getCompetitionYears(id!)));

    this.teamsForYear$ = combineLatest([
      clubid$,
      this.competitionYear.valueChanges,
      this.authService.userPermissions$,
      this.updateClub$.pipe(debounceTime(600)),
    ]).pipe(
      switchMap((args: any[]) => {
        return this.eventService.getSubEventsCompetition(args[1]).pipe(
          map((subEvents) => {
            args.push(subEvents?.map((subEvent) => subEvent?.subEvents?.map((subEvent) => subEvent.id)).flat(2));
            return args ;
          })
        );
      }),
      switchMap(([clubId, year, permissions, update, subEvents]) => {
        return this.clubService.getTeamsForSubEvents(clubId, subEvents) ;
      })
    );

    this.club$ = combineLatest([clubid$, this.updateClub$]).pipe(
      debounceTime(600),
      switchMap(([id]) => this.clubService.getClub(id!))
    );

    this.locations$ = combineLatest([clubid$, this.updateLocation$]).pipe(
      debounceTime(600),
      switchMap(([id]) => this.locationService.getLocations({ clubId: id }))
    );
    this.roles$ = combineLatest([clubid$, this.updateRoles$]).pipe(
      debounceTime(600),
      switchMap(([id]) => this.roleService.getRoles({ clubId: id }))
    );
  }

  async save(club: Club) {
    await this.clubService.updateClub(club).toPromise();
    this._snackBar.open('Saved', undefined, {
      duration: 1000,
      panelClass: 'success',
    });
  }

  async onPlayerUpdatedFromTeam(player: Player, team: Team) {
    if (player && team) {
      await this.teamService.updatePlayer(team, player).subscribe();
      this._snackBar.open('Player updated', undefined, {
        duration: 1000,
        panelClass: 'success',
      });
      this.updateClub$.next(null);
    }
  }

  async onPlayerAddedToRole(player: Player, role: Role) {
    if (player && role) {
      await this.roleService.addPlayer(role, player).toPromise();
      this._snackBar.open('Player added', undefined, {
        duration: 1000,
        panelClass: 'success',
      });
      this.updateRoles$.next(null);
    }
  }

  async onPlayerRemovedFromRole(player: Player, role: Role) {
    if (player && role) {
      await this.roleService.removePlayer(role, player).toPromise();
      this._snackBar.open('Player removed', undefined, {
        duration: 1000,
        panelClass: 'success',
      });
      this.updateRoles$.next(null);
    }
  }

  async onEditRole(role: Role, club: Club) {
    this.router.navigate(['/', 'admin', 'club', club.id, 'edit', 'role', role.id]);
  }

  async onEditLocation(location?: Location, club?: Club) {
    let dialogRef = this.dialog.open(LocationDialogComponent, {
      data: { location, club },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.updateLocation$.next(null);
    });
  }

  async onDeleteLocation(location: Location) {
    await lastValueFrom(this.locationService.deleteLocation(location.id!));
    this.updateLocation$.next(null);
  }
  async onDeleteRole(role: Role) {
    await lastValueFrom(this.roleService.deleteRole(role.id!));
    this.updateRoles$.next(null);
  }

  async onAddBasePlayer(player: Player, team: Team) {
    await lastValueFrom(this.teamService.addBasePlayer(team.id!, player.id!, team.subEvents[0].id!));
    this.updateClub$.next(null);
  }
  async onDeleteBasePlayer(player: Player, team: Team) {
    await lastValueFrom(this.teamService.removeBasePlayer(team.id!, player.id!, team.subEvents[0].id!));
    this.updateClub$.next(null);
  }
}
