import {
  CdkDragDrop,
  CdkDropList,
  moveItemInArray,
  transferArrayItem,
  copyArrayItem,
  CdkDrag,
} from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from 'app/player';
import { Club, Player, PlayerService, SubEvent, TeamService } from 'app/_shared';
import { Observable } from 'rxjs';
import { debounce, debounceTime, filter, map, startWith, switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-assembly',
  templateUrl: './assembly.component.html',
  styleUrls: ['./assembly.component.scss'],
})
export class AssemblyComponent implements OnInit {
  @Input()
  formGroup: FormGroup;
  lists = [
    'playerList',
    'reserveList',
    'single1List',
    'single2List',
    'single3List',
    'single4List',
    'double1List',
    'double2List',
    'double3List',
    'double4List',
  ];

  single1: Player[] = [];
  single2: Player[] = [];
  single3: Player[] = [];
  single4: Player[] = [];

  double1: Player[] = [];
  double2: Player[] = [];
  double3: Player[] = [];
  double4: Player[] = [];

  reserve: Player[] = [];
  players: Player[] = [];

  wherePlayer = {} as any;

  captionSingle1Prefix = '';
  captionSingle2Prefix = '';
  captionSingle3Prefix = '';
  captionSingle4Prefix = '';
  captionDouble1Prefix = '';
  captionDouble2Prefix = '';
  captionDouble3Prefix = '';
  captionDouble4Prefix = '';

  captionSingle1 = 'competition.team-assembly.single1';
  captionSingle2 = 'competition.team-assembly.single2';
  captionSingle3 = 'competition.team-assembly.single3';
  captionSingle4 = 'competition.team-assembly.single4';

  captionDouble1 = 'competition.team-assembly.double1';
  captionDouble2 = 'competition.team-assembly.double2';
  captionDouble3 = 'competition.team-assembly.double3';
  captionDouble4 = 'competition.team-assembly.double4';

  type: string;
  teamIndex: number = 0;
  club: Club;
  subEvent: SubEvent;
  ignorePlayers: Player[];
  loaded = false;
  errors = {} as { [key: string]: string };

  constructor(
    private teamService: TeamService,
    private matSnackBar: MatSnackBar,
    private playerService: PlayerService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    const form = this.formGroup.value;
    this.type = form?.team?.type;

    this.club = this.formGroup.get('club').value;
    const team = await this.teamService
      .getTeamsAndPlayers(form?.team?.id, form?.encounter?.draw?.subeventId)
      .toPromise();
    this.players = team.players.sort((a, b) => {
      if (a.gender != b.gender) {
        return a.gender == 'F' ? -1 : 1;
      }

      const playerA =
        (a.lastRanking?.single ?? 12) +
        (a.lastRanking?.double ?? 12) +
        (this.type == 'MX' ? a.lastRanking?.mix ?? 12 : 0);

      const playerB =
        (b.lastRanking?.single ?? 12) +
        (b.lastRanking?.double ?? 12) +
        (this.type == 'MX' ? b.lastRanking?.mix ?? 12 : 0);

      // If the same return single
      if (playerA == playerB) {
        return a.lastRanking?.single ?? 12 - b.lastRanking?.single ?? 12;
      }

      return playerA - playerB;
    });

    this.subEvent = team.subEvents[0];

    this.wherePlayer = {
      gender: this.type == 'MX' ? undefined : this.type,
      id: {
        $notIn: this.players?.map((p) => p.id),
      },
    };

    if (this.type == 'M') {
      this.captionSingle1Prefix = 'gender.male';
      this.captionSingle2Prefix = 'gender.male';
      this.captionSingle3Prefix = 'gender.male';
      this.captionSingle4Prefix = 'gender.male';
      this.captionDouble1Prefix = 'gender.male';
      this.captionDouble2Prefix = 'gender.male';
      this.captionDouble3Prefix = 'gender.male';
      this.captionDouble4Prefix = 'gender.male';
    } else if (this.type == 'F') {
      this.captionSingle1Prefix = 'gender.female';
      this.captionSingle2Prefix = 'gender.female';
      this.captionSingle3Prefix = 'gender.female';
      this.captionSingle4Prefix = 'gender.female';
      this.captionDouble1Prefix = 'gender.female';
      this.captionDouble2Prefix = 'gender.female';
      this.captionDouble3Prefix = 'gender.female';
      this.captionDouble4Prefix = 'gender.female';
    } else {
      this.captionSingle1Prefix = 'gender.male';
      this.captionSingle2Prefix = 'gender.male';

      this.captionSingle3Prefix = 'gender.female';
      this.captionSingle4Prefix = 'gender.female';
      this.captionSingle3 = 'competition.team-assembly.single1';
      this.captionSingle4 = 'competition.team-assembly.single2';

      this.captionDouble1Prefix = 'gender.male';
      this.captionDouble2Prefix = 'gender.female';
      this.captionDouble3 = `competition.team-assembly.mix1`;
      this.captionDouble4 = `competition.team-assembly.mix2`;
    }

    const players = await this.playerService.getBasePlayers(this.club.id, this.type).toPromise();

    this.ignorePlayers = players.data.club?.teams
      ?.map((t) => {
        const returend = [];
        if (t.teamNumber < form?.team?.teamNumber) {
          returend.push(t.players.filter((p) => p.base));
        }
        returend.push(
          t.players.filter(
            (p) =>
              (p.lastRanking?.single ?? 12) < this.subEvent.maxLevel ||
              (p.lastRanking?.double ?? 12) < this.subEvent.maxLevel ||
              (this.type == 'MX' && (p.lastRanking?.mix ?? 12) < this.subEvent.maxLevel)
          )
        );

        return returend;
      })
      .flat(2);

    this._calculateIndex();
    this.loaded = true;
  }

  addPlayer(player: Player) {
    this.players.push(player);

    this.wherePlayer.id = {
      $notIn: this.players?.map((p) => p.id),
    };
  }

  canDropPredicate = (item: CdkDrag, drop: CdkDropList) => {
    const length = drop?.data?.length ?? 0;

    if (drop?.id.includes('single')) {
      if (length >= 1) {
        return false;
      }
    }

    if (drop?.id.includes('double')) {
      if (length >= 2) {
        return false;
      }
    }

    if (drop?.data?.map((r) => r.id).includes(item.data.id)) {
      return false;
    }

    if (this.type == 'MX') {
      if (drop.id == 'double1List' && item.data.gender == 'F') {
        return false;
      } else if (drop.id == 'double2List' && item.data.gender == 'M') {
        return false;
      } else if (drop.id == 'double3List' || drop.id == 'double4List') {
        if (item.data.gender == 'M') {
          return drop.data.filter((r) => r.gender == 'M').length != 1;
        } else {
          return drop.data.filter((r) => r.gender == 'F').length != 1;
        }
      } else if ((drop.id == 'single1List' || drop.id == 'single2List') && item.data.gender == 'F') {
        return false;
      } else if ((drop.id == 'single3List' || drop.id == 'single4List') && item.data.gender == 'M') {
        return false;
      }
    }

    return true;
  };

  drop(event: CdkDragDrop<Player[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const movedPlayer = event.previousContainer.data[event.previousIndex];

      if (event.container.id == 'playerList' && event.container.data?.map((r) => r.id).includes(movedPlayer.id)) {
        event.previousContainer.data.splice(event.previousIndex, 1);
        this._doChecks();
        return;
      }
      const singles = [...this.single1, ...this.single2, ...this.single3, ...this.single4];
      const doubles = [...this.double1, ...this.double2, ...this.double3, ...this.double4];

      const singlesCount = singles.filter((p) => p.id === movedPlayer.id).length;
      const doublesCount = doubles.filter((p) => p.id === movedPlayer.id).length;

      if (singlesCount > 0 && event.container.id.includes('single') && !event.previousContainer.id.includes('single')) {
        return;
      }

      if (doublesCount > 1 && event.container.id.includes('double')) {
        return;
      }

      if (event.previousContainer.id == 'playerList') {
        copyArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
      } else {
        transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
      }

      if (event.container.id !== 'reserveList') {
        this.reserve = this.reserve.filter((r) => r.id !== movedPlayer.id);
      }
      this._doChecks();
    }
  }

  private _doChecks() {
    this._calculateIndex();
    this._checkOtherLists();
    this._sortLists();
  }

  private _sortLists() {
    const sortList = (a, b) => {
      if (a.gender != b.gender) {
        return a.gender == 'F' ? -1 : 1;
      }

      const playerA =
        (a.lastRanking?.single ?? 12) +
        (a.lastRanking?.double ?? 12) +
        (this.type == 'MX' ? a.lastRanking?.mix ?? 12 : 0);

      const playerB =
        (b.lastRanking?.single ?? 12) +
        (b.lastRanking?.double ?? 12) +
        (this.type == 'MX' ? b.lastRanking?.mix ?? 12 : 0);

      // If the same return single
      if (playerA == playerB) {
        return a.lastRanking?.single ?? 12 - b.lastRanking?.single ?? 12;
      }

      return playerA - playerB;
    };

    const sortDouble = (a, b) => {
      const playerA = a.lastRanking?.double ?? 12;
      const playerB = b.lastRanking?.double ?? 12;

      return playerA - playerB;
    };

    const sortMix = (a, b) => {
      return a.gender == 'F' ? -1 : 1;
    };

    this.players = this.players.sort(sortList);
    this.reserve = this.reserve.sort(sortList);

    this.double1 = this.double1.sort(sortDouble);
    this.double2 = this.double2.sort(sortDouble);

    if (this.type == 'MX') {
      this.double3 = this.double3.sort(sortMix);
      this.double4 = this.double4.sort(sortMix);
    } else {
      this.double3 = this.double3.sort(sortDouble);
      this.double4 = this.double4.sort(sortDouble);
    }
  }

  private _checkOtherLists() {
    const checkDoubles = (list1: Player[], list2: Player[], type: 'double' | 'mix') => {
      const double1 = (list1[0]?.lastRanking[type] ?? 0) + (list1[1]?.lastRanking[type] ?? 0);
      const double2 = (list2[0]?.lastRanking[type] ?? 0) + (list2[1]?.lastRanking[type] ?? 0);

      if (list1.length == 2 && list2.length == 2) {
        if (double1 > double2) {
          return 'competition.team-assembly.errors.players-above-lower';
        }

        if (double1 == double2) {
          const dl1 =
            (list1[0]?.lastRanking[type] ?? 12) < (list1[1]?.lastRanking[type] ?? 12)
              ? list1[0]?.lastRanking[type] ?? 12
              : list1[1]?.lastRanking[type] ?? 12;

          const dl2 =
            (list2[0]?.lastRanking[type] ?? 12) < (list2[1]?.lastRanking[type] ?? 12)
              ? list2[0]?.lastRanking[type] ?? 12
              : list2[1]?.lastRanking[type] ?? 12;
          if (dl1 > dl2) {
            return 'competition.team-assembly.errors.players-above-lower';
          }
        }
      }
    };

    this.errors = {};

    const single1 = this.single1[0]?.lastRanking.single ?? 0;
    const single2 = this.single2[0]?.lastRanking.single ?? 0;
    const single3 = this.single3[0]?.lastRanking.single ?? 0;
    const single4 = this.single4[0]?.lastRanking.single ?? 0;

    if (this.type == 'MX') {
      if (single1 != 0 && single2 != 0 && single1 > single2) {
        this.errors.single2 = 'competition.team-assembly.errors.player-above-lower';
      }

      if (single3 != 0 && single4 != 0 && single3 > single4) {
        this.errors.single4 = 'competition.team-assembly.errors.player-above-lower';
      }

      this.errors.double4 = checkDoubles(this.double3, this.double4, 'mix');
    } else {
      if (single1 != 0 && single2 != 0 && single1 > single2) {
        this.errors.single2 = 'competition.team-assembly.errors.player-above-lower';
      }

      if (single2 != 0 && single3 != 0 && single2 > single3) {
        this.errors.single3 = 'competition.team-assembly.errors.player-above-lower';
      }

      if (single3 != 0 && single4 != 0 && single3 > single4) {
        this.errors.single4 = 'competition.team-assembly.errors.player-above-lower';
      }

      this.errors.double2 = checkDoubles(this.double1, this.double2, 'double');
      this.errors.double3 = checkDoubles(this.double2, this.double3, 'double');
      this.errors.double4 = checkDoubles(this.double3, this.double4, 'double');
    }
  }

  private _calculateIndex() {
    const players = [
      ...this.single1,
      ...this.single2,
      ...this.single3,
      ...this.single4,
      ...this.double1,
      ...this.double2,
      ...this.double3,
      ...this.double4,
    ];

    let ids = players.map((o) => o.id);
    let filtered = players.filter(({ id }, index) => !ids.includes(id, index + 1));

    if (this.type !== 'MX') {
      const bestPlayers = filtered
        .map((r) => r.calcIndex(this.type))
        .sort((a, b) => a - b)
        .slice(0, 4);

      let missingIndex = 0;
      if (bestPlayers.length < 4) {
        missingIndex = (4 - bestPlayers.length) * 24;
      }

      this.teamIndex = bestPlayers.reduce((a, b) => a + b, missingIndex);
    } else {
      const bestPlayers = [
        // 2 best male
        ...filtered
          .filter((p) => p.gender == 'M')
          .map((r) => r.calcIndex(this.type))
          .sort((a, b) => a - b)
          .slice(0, 2),
        // 2 best female
        ...filtered
          .filter((p) => p.gender == 'F')
          .map((r) => r.calcIndex(this.type))
          .sort((a, b) => a - b)
          .slice(0, 2),
      ];

      let missingIndex = 0;
      if (bestPlayers.length < 4) {
        missingIndex = (4 - bestPlayers.length) * 36;
      }

      this.teamIndex = bestPlayers.reduce((a, b) => a + b, missingIndex);
    }
  }
}
