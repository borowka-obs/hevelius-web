import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NightPlanComponent } from './night-plan.component';
import { NightPlanService } from '../../services/night-plan.service';
import { CoordsFormatterService } from '../../services/coords-formatter.service';
import { MatTableModule } from '@angular/material/table';
import { BehaviorSubject } from 'rxjs';
import { Task } from '../../models/task';

describe('NightPlanComponent', () => {
  let component: NightPlanComponent;
  let fixture: ComponentFixture<NightPlanComponent>;
  let nightPlanService: {
    loadNightPlan: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };
  let tasksSubject: BehaviorSubject<Task[]>;

  beforeEach(async () => {
    tasksSubject = new BehaviorSubject<Task[]>([]);
    nightPlanService = {
      loadNightPlan: vi.fn(),
      connect: vi.fn().mockReturnValue(tasksSubject.asObservable()),
      disconnect: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ MatTableModule,
        NightPlanComponent
       ],
      providers: [
        { provide: NightPlanService, useValue: nightPlanService },
        CoordsFormatterService
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NightPlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load night plan on init', () => {
    expect(nightPlanService.loadNightPlan).toHaveBeenCalled();
  });

  it('should update task count when tasks change', () => {
    const mockTasks = [
      { task_id: 1, object: 'Test Object 1' },
      { task_id: 2, object: 'Test Object 2' }
    ] as Task[];

    tasksSubject.next(mockTasks);
    fixture.detectChanges();

    expect(component.taskCount).toBe(2);
  });

  it('should format RA correctly', () => {
    const coordFormatter = TestBed.inject(CoordsFormatterService);
    const testRA = 12.345;
    const formattedRA = component.formatRA(testRA);
    expect(formattedRA).toBe(coordFormatter.formatRA(testRA));
  });

  it('should format Dec correctly', () => {
    const coordFormatter = TestBed.inject(CoordsFormatterService);
    const testDec = 45.678;
    const formattedDec = component.formatDec(testDec);
    expect(formattedDec).toBe(coordFormatter.formatDec(testDec));
  });
});