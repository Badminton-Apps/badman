import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RankingSystemFieldsComponent } from './ranking-system-fields.component';

describe('RankingSystemFieldsComponent', () => {
  let component: RankingSystemFieldsComponent;
  let fixture: ComponentFixture<RankingSystemFieldsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RankingSystemFieldsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RankingSystemFieldsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
