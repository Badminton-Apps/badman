import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnInit,
  Input,
  Output,
} from '@angular/core';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { RankingSystem, RankingSystemGroup } from 'app/_shared';

@Component({
  selector: 'app-ranking-system-fields',
  templateUrl: './ranking-system-fields.component.html',
  styleUrls: ['./ranking-system-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankingSystemFieldsComponent implements OnInit {
  @Input()
  system: RankingSystem = {} as RankingSystem;
  
  @Input()
  groups!: RankingSystemGroup[] | null;

  @Output() save = new EventEmitter<RankingSystem>();

  rankingSystemForm!: FormGroup;

  ngOnInit() {
    this.rankingSystemForm = new FormGroup({
      name: new FormControl(this.system.name, Validators.required),
      rankingSystem: new FormControl(
        this.system.rankingSystem,
        Validators.required
      ),
      amountOfLevels: new FormControl(
        this.system.amountOfLevels,
        Validators.required
      ),
      procentWinning: new FormControl(
        this.system.procentWinning,
        Validators.required
      ),
      procentWinningPlus1: new FormControl(
        this.system.procentWinningPlus1,
        Validators.required
      ),
      procentLosing: new FormControl(
        this.system.procentLosing,
        Validators.required
      ),
      latestXGamesToUse: new FormControl(this.system.latestXGamesToUse),
      minNumberOfGamesUsedForUpgrade: new FormControl(
        this.system.minNumberOfGamesUsedForUpgrade,
        Validators.required
      ),
      maxDiffLevels: new FormControl(
        this.system.maxDiffLevels,
        Validators.required
      ),
      updateIntervalAmount: new FormControl(
        this.system.updateIntervalAmount,
        Validators.required
      ),
      updateIntervalUnit: new FormControl(
        this.system.updateIntervalUnit,
        Validators.required
      ),
      periodAmount: new FormControl(
        this.system.periodAmount,
        Validators.required
      ),
      periodUnit: new FormControl(
        this.system.periodUnit,
        Validators.required
      ),
      caluclationIntervalAmount: new FormControl(
        this.system.caluclationIntervalAmount,
        Validators.required
      ),
      calculationIntervalUnit: new FormControl(
        this.system.calculationIntervalUnit,
        Validators.required
      ),
      differenceForUpgrade: new FormControl(
        this.system.differenceForUpgrade,
        Validators.required
      ),
      differenceForDowngrade: new FormControl(
        this.system.differenceForDowngrade,
        Validators.required
      ),
      startingType: new FormControl(
        this.system.startingType,
        Validators.required
      ),
      maxLevelUpPerChange: new FormControl(this.system.maxLevelUpPerChange),
      maxLevelDownPerChange: new FormControl(this.system.maxLevelDownPerChange),
      gamesForInactivty: new FormControl(this.system.gamesForInactivty),
      inactivityAmount: new FormControl(this.system.inactivityAmount),
      inactivityUnit: new FormControl(this.system.inactivityUnit),
      groups: new FormControl(this.system.groups),
    });
  }

  update() {
    if (this.rankingSystemForm.valid) {
      this.save.next({ id: this.system.id, ...this.rankingSystemForm.value });
    }
  }

  groupCompare(option: RankingSystemGroup, value: RankingSystemGroup) {
    return option.id === value.id
  }
}
