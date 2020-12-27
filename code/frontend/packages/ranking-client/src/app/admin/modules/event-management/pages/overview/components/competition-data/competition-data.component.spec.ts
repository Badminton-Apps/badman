import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompetitionDataComponent } from './competition-data.component';

describe('CompetitionDataComponent', () => {
  let component: CompetitionDataComponent;
  let fixture: ComponentFixture<CompetitionDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CompetitionDataComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CompetitionDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
