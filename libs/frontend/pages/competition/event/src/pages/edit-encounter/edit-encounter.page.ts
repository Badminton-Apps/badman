import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { ActivatedRoute } from '@angular/router';
import { GameScoreComponentComponent } from '@badman/frontend-components';
import { EncounterCompetition, GamePlayer } from '@badman/frontend-models';
import { SeoService } from '@badman/frontend-seo';
import { gameLabel } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo } from 'apollo-angular';
import { BreadcrumbService } from 'xng-breadcrumb';
import { ReplacePlayerComponent } from '../../dialogs';

@Component({
  templateUrl: './edit-encounter.page.html',
  styleUrls: ['./edit-encounter.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TranslateModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    GameScoreComponentComponent
],
})
export class EditEncounterComponent implements OnInit {
  encounterCompetition!: EncounterCompetition;
  formGroup?: FormGroup;

  get games(): FormArray {
    return this.formGroup?.get('games') as FormArray;
  }

  constructor(
    private seoService: SeoService,
    private route: ActivatedRoute,
    private breadcrumbsService: BreadcrumbService,
    private apollo: Apollo,
    @Inject(PLATFORM_ID) private platformId: string,
    private formBuilder: FormBuilder,
    private matdialog: MatDialog,
  ) {}

  get isClient(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.encounterCompetition = data['encounterCompetition'];
      const encounterCompetitionName = `${this.encounterCompetition.home?.name} vs ${this.encounterCompetition.away?.name}`;
      const eventCompetitionName = data['eventCompetition']?.name;
      const drawCompetitionName = data['drawCompetition']?.name;

      this.seoService.update({
        title: encounterCompetitionName,
        description: `Encounter ${encounterCompetitionName}`,
        type: 'website',
        keywords: [
          'encounter',
          'competition',
          'badminton',
          this.encounterCompetition.home?.name ?? '',
          this.encounterCompetition.away?.name ?? '',
        ],
      });
      this.breadcrumbsService.set('@eventCompetition', eventCompetitionName);
      this.breadcrumbsService.set('@drawCompetition', drawCompetitionName);
      this.breadcrumbsService.set(
        '@encounterCompetition',
        encounterCompetitionName,
      );

      this.createForm();
    });
  }

  private createForm(): void {
    const games = [];

    // for loop for 8 times

    for (let i = 0; i < 8; i++) {
      let game = this.encounterCompetition?.games?.[i];
      if (!game) {
        game = {};
      }

      games.push(
        this.formBuilder.group({
          set1: this.formBuilder.group({
            score: this.formBuilder.group({
              team1: this.formBuilder.control(game?.set1Team1),
              team2: this.formBuilder.control(game?.set1Team2),
            }),
          }),
          set2: this.formBuilder.group({
            score: this.formBuilder.group({
              team1: game?.set2Team1,
              team2: game?.set2Team2,
            }),
          }),
          set3: this.formBuilder.group({
            score: this.formBuilder.group({
              team1: game?.set3Team1,
              team2: game?.set3Team2,
            }),
          }),
          team1: this.formBuilder.group({
            player1: this.formBuilder.control(
              this.getPlayer(game.players, 1, 1),
            ),
            player2: this.formBuilder.control(
              this.getPlayer(game.players, 1, 2),
            ),
          }),
          team2: this.formBuilder.group({
            player1: this.formBuilder.control(
              this.getPlayer(game.players, 2, 1),
            ),
            player2: this.formBuilder.control(
              this.getPlayer(game.players, 2, 2),
            ),
          }),
        }),
      );
    }
    this.formGroup = this.formBuilder.group({
      games: this.formBuilder.array(games),
      shuttle: this.formBuilder.control(this.encounterCompetition.shuttle),
      startHour: this.formBuilder.control(this.encounterCompetition.startHour),
      endHour: this.formBuilder.control(this.encounterCompetition.endHour),
    });
  }

  private getPlayer(players?: GamePlayer[], team?: number, player?: number) {
    return players?.find(
      (playerGame) => playerGame.team === team && playerGame.player === player,
    );
  }

  onSubmit() {
    // console.log(this.formGroup?.value); // ['SF', 'NY']
  }

  openDialog(player: GamePlayer, game: number, action: 'injured' | 'quit') {
    this.matdialog.open(ReplacePlayerComponent, {
      data: { player, game, encounter: this.encounterCompetition },
    });

    console.log(action);
  }

  getGameLabel(game: number) {
    const gameType = this.encounterCompetition.drawCompetition
      ?.subEventCompetition?.eventType as 'M' | 'F' | 'MX';

    if (!gameType) {
      return [];
    }

    return gameLabel(gameType, game + 1) as string[];
  }
}
