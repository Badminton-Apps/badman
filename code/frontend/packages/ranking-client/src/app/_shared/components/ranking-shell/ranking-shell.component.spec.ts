import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RankingShellComponent } from './ranking-shell.component';

describe('RankingShellComponent', () => {
  let component: RankingShellComponent;
  let fixture: ComponentFixture<RankingShellComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RankingShellComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RankingShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
