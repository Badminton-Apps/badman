import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamAssemblyComponent } from './team-assembly.component';

describe('TeamAssemblyComponent', () => {
  let component: TeamAssemblyComponent;
  let fixture: ComponentFixture<TeamAssemblyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TeamAssemblyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TeamAssemblyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
