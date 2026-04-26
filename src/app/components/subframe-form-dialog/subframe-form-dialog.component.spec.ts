import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SubframeFormDialogComponent } from './subframe-form-dialog.component';

describe('SubframeFormDialogComponent', () => {
  let component: SubframeFormDialogComponent;
  let fixture: ComponentFixture<SubframeFormDialogComponent>;
  let dialogRef: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    dialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [SubframeFormDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { mode: 'add', filters: [{ filter_id: 1, short_name: 'L', full_name: 'Lum', active: true }] } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SubframeFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('defaults count to 0 for add payload when omitted', () => {
    component.form.patchValue({
      filter_id: 1,
      exposure_time: 120,
      count: '',
      goal_count: '',
      active: true
    });

    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith({
      filter_id: 1,
      exposure_time: 120,
      count: 0,
      goal_count: undefined,
      active: true
    });
  });

  it('initializes count to 0 when editing legacy subframe', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SubframeFormDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            mode: 'edit',
            filters: [],
            subframe: {
              id: 3,
              project_id: 1,
              filter_id: 2,
              exposure_time: 300,
              active: true
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SubframeFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.form.get('count')?.value).toBe(0);
  });
});
