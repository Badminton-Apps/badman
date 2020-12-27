import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailRankingSystemComponent } from './detail-ranking-system.component';

describe('DetailRankingSystemComponent', () => {
  let component: DetailRankingSystemComponent;
  let fixture: ComponentFixture<DetailRankingSystemComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailRankingSystemComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailRankingSystemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
