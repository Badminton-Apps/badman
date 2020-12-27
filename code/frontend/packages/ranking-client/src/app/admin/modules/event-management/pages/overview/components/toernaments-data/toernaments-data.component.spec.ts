import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToernamentsDataComponent } from './toernaments-data.component';

describe('ToernamentsDataComponent', () => {
  let component: ToernamentsDataComponent;
  let fixture: ComponentFixture<ToernamentsDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ToernamentsDataComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ToernamentsDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
