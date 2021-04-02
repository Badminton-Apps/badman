import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatchFormComponent } from './match-form.component';

describe('MatchFormComponent', () => {
  let component: MatchFormComponent;
  let fixture: ComponentFixture<MatchFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MatchFormComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MatchFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
