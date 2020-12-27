import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ToernamentComponent } from './toernament.component';

describe('ToernamentComponent', () => {
  let component: ToernamentComponent;
  let fixture: ComponentFixture<ToernamentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ToernamentComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ToernamentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
