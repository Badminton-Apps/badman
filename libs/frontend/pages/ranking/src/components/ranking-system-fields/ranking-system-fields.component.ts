import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnInit,
  Input,
  Output,
} from '@angular/core';
import {
  FormGroup,
  Validators,
  FormControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '@badman/frontend-components';
import { RankingGroup, RankingSystem } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
import { debounceTime } from 'rxjs';

@Component({
  standalone: true,
  imports: [
    // Core modules
    CommonModule,
    RouterModule,

    TranslateModule,
    ReactiveFormsModule,
    MomentModule,

    // Material Modules
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatMenuModule,
    MatOptionModule,
    MatSelectModule,
    MatSlideToggleModule,

    // Own Module
    PageHeaderComponent,
  ],
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
    this.rankingSystemForm = new FormGroup({
      id: new FormControl(this.system.id, Validators.required),
      name: new FormControl(this.system.name, Validators.required),
      rankingSystem: new FormControl(
        this.system.rankingSystem,
        Validators.required,
      ),
      amountOfLevels: new FormControl(
        this.system.amountOfLevels,
        Validators.required,
      ),
      procentWinning: new FormControl(
        this.system.procentWinning,
        Validators.required,
      ),
      procentWinningPlus1: new FormControl(
        this.system.procentWinningPlus1,
        Validators.required,
      ),
      procentLosing: new FormControl(
        this.system.procentLosing,
        Validators.required,
      ),
      latestXGamesToUse: new FormControl(this.system.latestXGamesToUse),
      minNumberOfGamesUsedForUpgrade: new FormControl(
        this.system.minNumberOfGamesUsedForUpgrade,
        Validators.required,
      ),
      maxDiffLevels: new FormControl(
        this.system.maxDiffLevels,
        Validators.required,
      ),
      updateIntervalAmount: new FormControl(
        this.system.updateIntervalAmount,
        Validators.required,
      ),
      updateIntervalUnit: new FormControl(
        this.system.updateIntervalUnit,
        Validators.required,
      ),
      updateDayOfWeek: new FormControl(
        this.system.updateDayOfWeek,
        Validators.required,
      ),

      periodAmount: new FormControl(
        this.system.periodAmount,
        Validators.required,
      ),
      periodUnit: new FormControl(this.system.periodUnit, Validators.required),
      calculationIntervalAmount: new FormControl(
        this.system.calculationIntervalAmount,
        Validators.required,
      ),
      calculationIntervalUnit: new FormControl(
        this.system.calculationIntervalUnit,
        Validators.required,
      ),
      calculationDayOfWeek: new FormControl(
        this.system.calculationDayOfWeek,
        Validators.required,
      ),
      differenceForDowngradeSingle: new FormControl(
        this.system.differenceForDowngradeSingle,
        Validators.required,
      ),
      differenceForDowngradeDouble: new FormControl(
        this.system.differenceForDowngradeDouble,
        Validators.required,
      ),
      differenceForDowngradeMix: new FormControl(
        this.system.differenceForDowngradeMix,
        Validators.required,
      ),
      differenceForUpgradeSingle: new FormControl(
        this.system.differenceForUpgradeSingle,
        Validators.required,
      ),
      differenceForUpgradeDouble: new FormControl(
        this.system.differenceForUpgradeDouble,
        Validators.required,
      ),
      differenceForUpgradeMix: new FormControl(
        this.system.differenceForUpgradeMix,
        Validators.required,
      ),
      startingType: new FormControl(
        this.system.startingType,
        Validators.required,
      ),
      primary: new FormControl(this.system.primary),
      calculateUpdates: new FormControl(this.system.calculateUpdates),
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
      (group: RankingGroup) => !this.system.rankingGroups?.includes(group),
    );
    // find groups removed
    const removedGroups = this.system.rankingGroups?.filter(
      (group) => !event.value.includes(group),
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
        1,
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
