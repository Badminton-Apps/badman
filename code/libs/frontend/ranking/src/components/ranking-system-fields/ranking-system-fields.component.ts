import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnInit,
  Input,
  Output,
} from '@angular/core';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';
import { RankingGroup, RankingSystem } from '@badman/frontend-models';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'badman-ranking-system-fields',
  templateUrl: './ranking-system-fields.component.html',
  styleUrls: ['./ranking-system-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankingSystemFieldsComponent implements OnInit {
  @Input()
  system: RankingSystem = {} as RankingSystem;

  @Input()
  groups!: RankingGroup[] | null;

  @Output() whenUpdated = new EventEmitter<RankingSystem>();
  @Output() whenGroupAdded = new EventEmitter<{
    groupId: string;
    systemId: string;
  }>();
  @Output() whenGroupRemoved = new EventEmitter<{
    groupId: string;
    systemId: string;
  }>();

  rankingSystemForm!: FormGroup;
  rakingGroupForm!: FormControl;

  ngOnInit() {
    console.log(this.system);
    
    this.rankingSystemForm = new FormGroup({
      id: new FormControl(this.system.id, Validators.required),
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
      periodUnit: new FormControl(this.system.periodUnit, Validators.required),
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
    });

    this.rakingGroupForm = new FormControl(this.system.rankingGroups);

    this.rankingSystemForm.valueChanges
      .pipe(debounceTime(600))
      .subscribe((value) => {
        if (this.rankingSystemForm.valid) {
          this.whenUpdated.next(value);
        }
      });
  }

  onGroupChange(event: MatSelectChange) {
    // find groups added
    const addedGroups: RankingGroup[] = event.value.filter(
      (group: RankingGroup) => !this.system.rankingGroups?.includes(group)
    );
    // find groups removed
    const removedGroups = this.system.rankingGroups?.filter(
      (group) => !event.value.includes(group)
    );

    // emit events
    addedGroups?.forEach((group) => {
      if (!this.system.id) {
        throw new Error('System id is not set');
      }
      if (!group.id) {
        throw new Error('System id is not set');
      }

      this.whenGroupAdded.emit({
        groupId: group.id,
        systemId: this.system.id,
      });

      this.system.rankingGroups?.push(group);
    });
    removedGroups?.forEach((group) => {
      if (!this.system.id) {
        throw new Error('System id is not set');
      }
      if (!group.id) {
        throw new Error('System id is not set');
      }
      this.whenGroupRemoved.emit({
        groupId: group.id,
        systemId: this.system.id,
      });

      this.system.rankingGroups?.splice(
        this.system.rankingGroups?.indexOf(group),
        1
      );
    });
  }

  groupCompare(option: RankingGroup, value: RankingGroup) {
    if (!option?.id || !value?.id) {
      return false;
    }
    return option.id === value.id;
  }
}
