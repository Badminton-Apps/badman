import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PickEventDialogComponent } from './pick-event-dialog.component';

describe('PickEventDialogComponent', () => {
  let component: PickEventDialogComponent;
  let fixture: ComponentFixture<PickEventDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PickEventDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PickEventDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
