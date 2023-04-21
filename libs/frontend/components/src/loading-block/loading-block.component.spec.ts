import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingBlockComponent } from './loading-block.component';

describe('LoadingBlockComponent', () => {
  let component: LoadingBlockComponent;
  let fixture: ComponentFixture<LoadingBlockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingBlockComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
