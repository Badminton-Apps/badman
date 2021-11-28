import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Player, RankingPlace, RankingSystem } from 'app/_shared';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-edit-ranking',
  templateUrl: './edit-ranking.component.html',
  styleUrls: ['./edit-ranking.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditRankingComponent implements OnInit {
  rankingForm!: FormGroup;

  @Output() onRankingPlaceChanged = new EventEmitter<Partial<RankingPlace>>();

  @Input()
  rankingPlace?: RankingPlace;

  @Input()
  rankingSystem!: RankingSystem;


  ngOnInit() {

    const singleControl = new FormControl(
      this.rankingPlace?.single ?? this.rankingSystem?.amountOfLevels ?? 0,
      Validators.required
    );
    const doubleControl = new FormControl(
      this.rankingPlace?.double ?? this.rankingSystem?.amountOfLevels ?? 0,
      Validators.required
    );
    const mixControl = new FormControl(
      this.rankingPlace?.mix ?? this.rankingSystem?.amountOfLevels ?? 0,
      Validators.required
    );

    this.rankingForm = new FormGroup({
      single: singleControl,
      double: doubleControl,
      mix: mixControl,
    });

  

    this.rankingForm.valueChanges.pipe(debounceTime(600)).subscribe((value) => {
      if (this.rankingForm.valid) {
        this.onRankingPlaceChanged.next({
          id: this.rankingPlace?.id,
          single: +value.single,
          double: +value.double,
          mix: +value.mix,
        });
      }
    });
  }
}
