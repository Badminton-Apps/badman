import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectClubComponent } from './select-club.component';

describe('SelectClubComponent', () => {
  let component: SelectClubComponent;
  let fixture: ComponentFixture<SelectClubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SelectClubComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectClubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
