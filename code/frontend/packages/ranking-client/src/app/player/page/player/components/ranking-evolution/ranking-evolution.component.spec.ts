import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RankingEvolutionComponent } from './ranking-evolution.component';

describe('RankingEvolutionComponent', () => {
  let component: RankingEvolutionComponent;
  let fixture: ComponentFixture<RankingEvolutionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RankingEvolutionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RankingEvolutionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
