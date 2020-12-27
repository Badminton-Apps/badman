import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddRankingSystemComponent } from './add-ranking-system.component';

describe('AddRankingSystemComponent', () => {
  let component: AddRankingSystemComponent;
  let fixture: ComponentFixture<AddRankingSystemComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddRankingSystemComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddRankingSystemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
