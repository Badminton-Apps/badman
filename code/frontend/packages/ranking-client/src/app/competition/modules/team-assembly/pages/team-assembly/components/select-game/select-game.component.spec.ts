import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectGameComponent } from './select-game.component';

describe('SelectGameComponent', () => {
  let component: SelectGameComponent;
  let fixture: ComponentFixture<SelectGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SelectGameComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
