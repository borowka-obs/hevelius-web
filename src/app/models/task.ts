// Represents a single date and time as returned by the backend.
interface Date {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
}

// This structure represents a task as returned by the backend
// from /api/tasks endpoint. See tasks() in flask/app.py in the
// github.com/tomaszmrugala/hevelius-backend repository.
export interface Task {
    task_id: number;
    user_id: number;
    aavso_id: string;
    object: string;
    ra: number;
    decl: number;
    exposure: number;
    state: number;
    activated?: string;
    auto_center?: boolean;
    binning?: number;
    calibrate?: boolean;
    calibrated?: boolean;
    comment?: string;
    created?: string;
    descr?: string;
    dither?: boolean;
    filter?: string;
    guiding?: boolean;
    imagename?: string;
    max_moon_phase?: number;
    max_sun_alt?: number;
    min_alt?: number;
    min_interval?: number;
    moon_distance?: number;
    other_cmd?: string | null;
    performed?: string;
    sent?: boolean;
    skip_after?: string;
    skip_before?: string;
    solve?: boolean;
    solved?: boolean;
}

// For an array of these observations:
interface TaskList {
    tasks: Task[];
}
