import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditRankingSystemComponent } from './edit-ranking-system.component';

describe('EditRankingSystemComponent', () => {
  let component: EditRankingSystemComponent;
  let fixture: ComponentFixture<EditRankingSystemComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditRankingSystemComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditRankingSystemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
