/* ─── Shared TypeScript types for NimbusU ─────────────────────────── */

export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: "admin" | "faculty" | "dean" | "head" | "student";
    department: string | null;
    department_name: string | null;
    school_name: string | null;
    program_name: string | null;
    profile_picture: string | null;
    phone: string | null;
    is_active: boolean;
    is_deleted?: boolean;
    deleted_at?: string | null;
    failed_login_attempts: number;
    last_login: string | null;
    created_at: string;
    updated_at: string;
    student_profile: StudentProfile | null;
    faculty_profile: FacultyProfile | null;
}

export interface StudentProfile {
    id: string;
    student_id_number: string;
    roll_no?: string | null;
    register_no?: string | null;
    program: string;
    current_semester: number;
    admission_date: string;
    batch_year: number;
    batch?: string | null;
    division?: string | null;
}

export interface FacultyProfile {
    id: string;
    employee_id: string;
    designation: string;
    specialization: string;
    joining_date: string;
    consultation_hours: Record<string, unknown>;
}

export interface School {
    id: string;
    name: string;
    code: string;
    dean: string | null;
    dean_name: string | null;
    created_at: string;
}

export interface Department {
    id: string;
    name: string;
    code: string;
    school: string | null;
    school_name: string | null;
    head: string | null;
    head_name: string | null;
    created_at: string;
}

export interface Program {
    id: string;
    name: string;
    code: string;
    department: string;
    department_name: string;
    duration_years: number;
    credit_limit?: number;
    degree_type: "UG" | "PG" | "PhD" | "Diploma";
    is_active: boolean;
}

export interface Semester {
    id: string;
    name: string;
    academic_year: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
}

export interface Course {
    id: string;
    name: string;
    code: string;
    department: string;
    department_name: string;
    credits: number;
    description: string;
    is_active: boolean;
    is_deleted?: boolean;
    deleted_at?: string | null;
}

export interface CoursePrerequisite {
    id: string;
    course: string;
    course_name?: string;
    course_code?: string;
    prerequisite: string;
    prerequisite_name?: string;
    prerequisite_code?: string;
    is_corequisite: boolean;
    created_at: string;
}

export interface CourseOffering {
    id: string;
    course: string;
    course_name: string;
    course_code: string;
    semester: string;
    semester_name: string;
    faculty: string;
    faculty_name: string;
    section: string;
    max_students: number;
    enrolled_count: number;
}

export interface Enrollment {
    id: string;
    student: string;
    student_name: string;
    course_offering: string;
    course_name: string;
    enrolled_at: string;
    status: string;
}

export interface Assignment {
    id: string;
    title: string;
    description: string;
    course_offering: string;
    course_name: string;
    created_by: string;
    created_by_name: string;
    due_date: string;
    max_marks: number;
    assignment_type: "assignment" | "quiz" | "exam" | "project";
    attachments: Record<string, unknown>[];
    grace_period_days?: number;
    penalty_per_day?: number;
    max_penalty_percentage?: number;
    is_published: boolean;
    submission_count: number;
    is_deleted?: boolean;
    deleted_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface GradingRubric {
    id: string;
    assignment: string;
    title: string;
    description: string | null;
    total_points: number;
    criteria?: RubricCriteria[];
}

export interface RubricCriteria {
    id: string;
    rubric: string;
    title: string;
    description: string | null;
    max_points: number;
    order: number;
}

export interface AssignmentGroup {
    id: string;
    assignment: string;
    name: string;
    members: string[];
    created_at: string;
}

export interface Submission {
    id: string;
    assignment: string;
    student: string;
    student_name: string;
    file: string | null;
    text_content: string | null;
    submitted_at: string;
    marks_obtained: number | null;
    grade: string | null;
    feedback: string | null;
    graded_by: string | null;
    graded_at: string | null;
    is_final?: boolean;
    version?: number;
    status: "submitted" | "graded" | "returned";
}

export interface Content {
    id: string;
    title: string;
    description: string;
    content_type: "document" | "video" | "link" | "image" | "other";
    file: string | null;
    file_size: number | null;
    mime_type: string | null;
    external_url: string | null;
    folder: string | null;
    course_offering: string | null;
    uploaded_by: string;
    uploaded_by_name: string;
    visibility: "public" | "department" | "course" | "private";
    is_published: boolean;
    is_deleted?: boolean;
    deleted_at?: string | null;
    tags: ContentTag[];
    created_at: string;
    updated_at: string;
}

export interface ContentTag {
    id: string;
    name: string;
}

export interface ContentFolder {
    id: string;
    name: string;
    parent: string | null;
    created_by: string;
    created_by_name: string;
    course_offering: string | null;
    visibility: string;
    created_at: string;
}

export interface TimetableEntry {
    id: string;
    course_offering: string;
    course_name: string;
    course_code: string;
    faculty_name: string;
    batch: string;
    subject_type: "classroom" | "lab" | "tutorial";
    subject_type_display: string;
    location: string;
    day_of_week: number;
    day_name: string;
    start_time: string;
    end_time: string;
    semester: string;
    semester_name?: string;
    department_name?: string;
    program_name?: string;
    division?: string;
    is_active: boolean;
}

export interface AttendanceRecord {
    id: string;
    timetable_entry: string;
    student: string;
    student_name: string;
    date: string;
    status: "present" | "absent" | "late" | "excused";
    marked_by: string;
    remarks: string;
    created_at: string;
}

export interface Announcement {
    id: string;
    title: string;
    body: string;
    created_by: string;
    created_by_name: string;
    target_type: string;
    target_id: string | null;
    is_urgent: boolean;
    publish_at: string | null;
    expires_at: string | null;
    attachments?: Record<string, unknown>[];
    is_published: boolean;
    created_at: string;
}

export interface Message {
    id: string;
    sender: string;
    sender_name: string;
    receiver: string;
    receiver_name: string;
    subject: string;
    body: string;
    file?: string | null;
    file_name?: string | null;
    is_read: boolean;
    read_at: string | null;
    created_at: string;
}

export interface Notification {
    id: string;
    user: string;
    title: string;
    message: string;
    notification_type: string;
    reference_type: string | null;
    reference_id: string | null;
    channel: string;
    is_read: boolean;
    read_at: string | null;
    status: string;
    created_at: string;
}

export interface AuditLog {
    id: string;
    user: string;
    user_email: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details: Record<string, unknown>;
    ip_address: string;
    created_at: string;
}

export interface AcademicEvent {
    id: string;
    title: string;
    description: string;
    event_type: "holiday" | "exam" | "event" | "deadline" | "registration" | "other";
    event_type_display: string;
    start_date: string;
    end_date: string;
    semester: string | null;
    semester_name: string | null;
    is_university_wide: boolean;
    department: string | null;
    department_name: string | null;
    created_by: string;
    created_by_name: string | null;
    created_at: string;
}

export interface ClassCancellation {
    id: string;
    timetable_entry: string;
    course_name: string;
    original_date: string;
    action: "cancelled" | "rescheduled";
    action_display: string;
    reason: string;
    new_date: string | null;
    new_start_time: string | null;
    new_end_time: string | null;
    new_location: string;
    cancelled_by: string;
    faculty_name: string;
    created_at: string;
}

export interface ContentVersion {
    id: string;
    content: string;
    version_number: number;
    file: string | null;
    file_size: number | null;
    change_summary: string;
    uploaded_by: string;
    uploaded_by_name: string;
    created_at: string;
}

export interface ContentComment {
    id: string;
    content: string;
    author: string;
    author_name: string;
    parent: string | null;
    body: string;
    is_resolved: boolean;
    reply_count: number;
    created_at: string;
    updated_at: string;
}

export interface WebhookEndpoint {
    id: string;
    name: string;
    url: string;
    events: string[];
    owner: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface WebhookDelivery {
    id: string;
    endpoint: string;
    endpoint_name: string;
    event_type: string;
    payload: Record<string, unknown>;
    status: "pending" | "success" | "failed";
    response_status_code: number | null;
    response_body: string;
    attempts: number;
    delivered_at: string | null;
    created_at: string;
}

export interface TimetableSwapRequest {
    id: string;
    requester: string;
    requester_name: string;
    target_faculty: string;
    target_faculty_name: string;
    requester_entry: string;
    requester_course_name: string;
    target_entry: string;
    target_course_name: string;
    message: string;
    status: "pending" | "approved" | "rejected";
    responded_at: string | null;
    created_at: string;
}

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface Tokens {
    access: string;
    refresh: string;
}

export interface Grade {
    id: string;
    student: string;
    student_name: string;
    course_offering: string;
    course_name: string;
    semester?: string;
    semester_name?: string;
    grade_letter: string;
    grade_points: number;
    credits_earned: number;
    is_pass: boolean;
    created_at: string;
    updated_at: string;
}

export interface RoomBooking {
    id: string;
    room: string;
    room_name?: string;
    booked_by: string;
    booked_by_name?: string;
    purpose: string;
    start_time: string;
    end_time: string;
    status: "pending" | "approved" | "rejected";
    approved_by?: string | null;
    created_at: string;
}

export interface SubstituteFaculty {
    id: string;
    timetable_entry: string;
    original_faculty: string;
    substitute_faculty: string;
    substitute_faculty_name?: string;
    date: string;
    reason: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
}
