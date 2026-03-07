import api from "@/lib/api";
import type {
    PaginatedResponse,
    User,
    School,
    Department,
    Program,
    Semester,
    Course,
    CourseOffering,
    Enrollment,
    Assignment,
    Submission,
    Content,
    ContentFolder,
    ContentTag,
    TimetableEntry,
    AttendanceRecord,
    Announcement,
    Message,
    Notification,
    AuditLog,
    AcademicEvent,
    ClassCancellation,
    ContentVersion,
    ContentComment,
    WebhookEndpoint,
    WebhookDelivery,
    TimetableSwapRequest,
    Grade,
    RoomBooking,
    SubstituteFaculty,
    CoursePrerequisite,
    GradingRubric,
    RubricCriteria,
    AssignmentGroup,
    SiteSettings,
    StudentTask,
    StudentDailyQuestionPerformance,
    DiscussionForum,
    DiscussionPost,
    DailyQuestion,
    DailyQuestionAssignment,
    DailyQuestionResponse,
    FacultyDailyQuestionStudentScore,
} from "@/lib/types";

type DailyQuestionPayload = Record<string, unknown>;

/* ─── Auth ────────────────────────────────────────────────────────── */

export const usersService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<User>>("/users/", { params }),
    get: (id: string) => api.get<User>(`/users/${id}/`),
    create: (data: Partial<User> & { password: string }) =>
        api.post<User>("/users/", data),
    update: (id: string, data: Partial<User>) =>
        api.patch<User>(`/users/${id}/`, data),
    delete: (id: string) => api.delete(`/users/${id}/`),
    bulkCreate: (data: { users: Array<Record<string, unknown>> }) =>
        api.post<{ status: string; message: string }>("/users/bulk-create/", data),
    resetPassword: (id: string, new_password: string) =>
        api.post(`/users/${id}/reset-password/`, { new_password }),
    me: () => api.get<User>("/users/me/"),
    updateMe: (data: Partial<User>) => api.patch<User>("/users/me/", data),
    uploadAvatar: (file: File) => {
        const fd = new FormData();
        fd.append("avatar", file);
        return api.post("/users/me/avatar/", fd, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },
    changePassword: (data: { old_password: string; new_password: string }) =>
        api.post("/auth/password/change/", data),
    preferences: () => api.get<any>("/users/me/preferences/"),
    updatePreferences: (data: any) => api.patch<any>("/users/me/preferences/", data),
};

/* ─── Schools ─────────────────────────────────────────────────────── */

export const schoolsService = {
    list: (params?: Record<string, string>) => api.get<PaginatedResponse<School>>("/academics/schools/", { params }),
    get: (id: string) => api.get<School>(`/academics/schools/${id}/`),
    create: (data: Partial<School>) =>
        api.post<School>("/academics/schools/", data),
    update: (id: string, data: Partial<School>) =>
        api.patch<School>(`/academics/schools/${id}/`, data),
    delete: (id: string) => api.delete(`/academics/schools/${id}/`),
};

/* ─── Departments ─────────────────────────────────────────────────── */

export const departmentsService = {
    list: (params?: Record<string, string>) => api.get<PaginatedResponse<Department>>("/departments/", { params }),
    get: (id: string) => api.get<Department>(`/departments/${id}/`),
    create: (data: Partial<Department>) =>
        api.post<Department>("/departments/", data),
    update: (id: string, data: Partial<Department>) =>
        api.patch<Department>(`/departments/${id}/`, data),
    delete: (id: string) => api.delete(`/departments/${id}/`),
};

/* ─── Academics ───────────────────────────────────────────────────── */

export const programsService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<Program>>("/academics/programs/", { params }),
    get: (id: string) => api.get<Program>(`/academics/programs/${id}/`),
    create: (data: Partial<Program>) =>
        api.post<Program>("/academics/programs/", data),
    update: (id: string, data: Partial<Program>) =>
        api.patch<Program>(`/academics/programs/${id}/`, data),
    delete: (id: string) => api.delete(`/academics/programs/${id}/`),
};

export const semestersService = {
    list: (params?: Record<string, string>) => api.get<PaginatedResponse<Semester>>("/academics/semesters/", { params }),
    current: () => api.get("/academics/semesters/current/"),
    create: (data: Partial<Semester>) =>
        api.post<Semester>("/academics/semesters/", data),
    update: (id: string, data: Partial<Semester>) =>
        api.patch<Semester>(`/academics/semesters/${id}/`, data),
    delete: (id: string) => api.delete(`/academics/semesters/${id}/`),
};

export const coursesService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<Course>>("/academics/courses/", { params }),
    get: (id: string) => api.get<Course>(`/academics/courses/${id}/`),
    create: (data: Partial<Course>) =>
        api.post<Course>("/academics/courses/", data),
    update: (id: string, data: Partial<Course>) =>
        api.patch<Course>(`/academics/courses/${id}/`, data),
    delete: (id: string) => api.delete(`/academics/courses/${id}/`),
};

export const offeringsService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<CourseOffering>>("/academics/offerings/", { params }),
    get: (id: string) => api.get<CourseOffering>(`/academics/offerings/${id}/`),
    create: (data: Partial<CourseOffering>) =>
        api.post<CourseOffering>("/academics/offerings/", data),
    update: (id: string, data: Partial<CourseOffering>) =>
        api.patch<CourseOffering>(`/academics/offerings/${id}/`, data),
    students: (id: string) => api.get(`/academics/offerings/${id}/students/`),
    delete: (id: string) => api.delete(`/academics/offerings/${id}/`),
};

export const enrollmentsService = {
    create: (data: { student: string; course_offering: string }) =>
        api.post<Enrollment>("/enrollments/", data),
    mine: () =>
        api.get<PaginatedResponse<Enrollment>>("/enrollments/me/"),
    bulkCreate: (data: any) =>
        api.post<{ status: string; message: string }>("/enrollments/bulk-create/", data),
    export: (params?: Record<string, string>) =>
        api.get<Blob>("/enrollments/export/", { params, responseType: "blob" }),
    delete: (id: string) => api.delete(`/enrollments/${id}/`),
};

export const prerequisitesService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<CoursePrerequisite>>("/academics/prerequisites/", { params }),
    delete: (id: string) => api.delete(`/academics/prerequisites/${id}/`),
};

export const gradesService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<Grade>>("/academics/grades/", { params }),
    create: (data: Partial<Grade>) =>
        api.post<Grade>("/academics/grades/", data),
    update: (id: string, data: Partial<Grade>) =>
        api.patch<Grade>(`/academics/grades/${id}/`, data),
    delete: (id: string) => api.delete(`/academics/grades/${id}/`),
    me: () => api.get<Grade[]>("/academics/grades/me/"),
    gpa: (params?: Record<string, string>) =>
        api.get<{ status: string; data: any }>("/academics/grades/gpa/", { params }),
    export: (params?: Record<string, string>) =>
        api.get<Blob>("/academics/grades/export/", { params, responseType: "blob" }),
};

export const studentTasksService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<StudentTask>>("/academics/tasks/", { params }),
    create: (data: Partial<StudentTask>) =>
        api.post<StudentTask>("/academics/tasks/", data),
    update: (id: string, data: Partial<StudentTask>) =>
        api.patch<StudentTask>(`/academics/tasks/${id}/`, data),
    delete: (id: string) => api.delete(`/academics/tasks/${id}/`),
};

export const dailyQuestionsService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<DailyQuestion>>("/academics/daily-questions/", { params }),
    get: (id: string) => api.get<DailyQuestion>(`/academics/daily-questions/${id}/`),
    create: (data: DailyQuestionPayload) =>
        api.post<DailyQuestion>("/academics/daily-questions/", data),
    update: (id: string, data: DailyQuestionPayload) =>
        api.patch<DailyQuestion>(`/academics/daily-questions/${id}/`, data),
    delete: (id: string) => api.delete(`/academics/daily-questions/${id}/`),
    assign: (id: string, data: { student_ids: string[]; batch?: string }) =>
        api.post(`/academics/daily-questions/${id}/assign/`, data),
    stats: () => api.get<{
        total_assigned: number;
        total_submitted: number;
        total_correct: number;
        average_time_seconds: number;
        accuracy_rate: number;
    }>("/academics/daily-questions/stats/"),
    studentScores: (params?: Record<string, string>) =>
        api.get<FacultyDailyQuestionStudentScore[]>("/academics/daily-questions/student-scores/", { params }),
    myAssignments: () =>
        api.get<PaginatedResponse<DailyQuestionAssignment>>("/academics/daily-questions/my-assignments/"),
    performance: () =>
        api.get<PaginatedResponse<StudentDailyQuestionPerformance>>("/academics/daily-questions/performance/"),
    start: (assignmentId: string) =>
        api.post<{ id: string; started_at: string; status: string }>(`/academics/daily-question-assignments/${assignmentId}/start/`),
    submit: (
        assignmentId: string,
        data: { selected_options?: number[]; code_answer?: string }
    ) =>
        api.post<{
            assignment_id: string;
            is_correct: boolean;
            points_earned: number;
            submitted_at: string;
            time_taken_seconds: number;
        }>(`/academics/daily-question-assignments/${assignmentId}/submit/`, data),
};

/* ─── Assignments ─────────────────────────────────────────────────── */

export const assignmentsService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<Assignment>>("/assignments/", { params }),
    get: (id: string) => api.get<Assignment>(`/assignments/${id}/`),
    create: (data: Partial<Assignment>) =>
        api.post<Assignment>("/assignments/", data),
    update: (id: string, data: Partial<Assignment>) =>
        api.patch<Assignment>(`/assignments/${id}/`, data),
    delete: (id: string) => api.delete(`/assignments/${id}/`),
    submit: (id: string, data: FormData) =>
        api.post(`/assignments/${id}/submit/`, data, {
            headers: { "Content-Type": "multipart/form-data" },
        }),
    submissions: (id: string) =>
        api.get<PaginatedResponse<Submission>>(`/assignments/${id}/submissions/`),
    mySubmission: (id: string) =>
        api.get(`/assignments/${id}/submissions/me/`),
    grade: (
        assignmentId: string,
        submissionId: string,
        data: { marks_obtained: number; grade?: string; feedback?: string }
    ) =>
        api.patch(`/assignments/${assignmentId}/submissions/${submissionId}/grade/`, data),
    exportGrades: (offeringId: string) =>
        api.get(`/assignments/export/${offeringId}/`, { responseType: "blob" }),
};

export const rubricsService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<GradingRubric>>("/assignments/rubrics/", { params }),
    get: (id: string) => api.get<GradingRubric>(`/assignments/rubrics/${id}/`),
    create: (data: Partial<GradingRubric>) =>
        api.post<GradingRubric>("/assignments/rubrics/", data),
    update: (id: string, data: Partial<GradingRubric>) =>
        api.patch<GradingRubric>(`/assignments/rubrics/${id}/`, data),
    delete: (id: string) => api.delete(`/assignments/rubrics/${id}/`),
};

export const rubricCriteriaService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<RubricCriteria>>("/assignments/rubric-criteria/", { params }),
    get: (id: string) => api.get<RubricCriteria>(`/assignments/rubric-criteria/${id}/`),
    create: (data: Partial<RubricCriteria>) =>
        api.post<RubricCriteria>("/assignments/rubric-criteria/", data),
    update: (id: string, data: Partial<RubricCriteria>) =>
        api.patch<RubricCriteria>(`/assignments/rubric-criteria/${id}/`, data),
    delete: (id: string) => api.delete(`/assignments/rubric-criteria/${id}/`),
};

export const assignmentGroupsService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<AssignmentGroup>>("/assignments/groups/", { params }),
    get: (id: string) => api.get<AssignmentGroup>(`/assignments/groups/${id}/`),
    create: (data: Partial<AssignmentGroup>) =>
        api.post<AssignmentGroup>("/assignments/groups/", data),
    update: (id: string, data: Partial<AssignmentGroup>) =>
        api.patch<AssignmentGroup>(`/assignments/groups/${id}/`, data),
    delete: (id: string) => api.delete(`/assignments/groups/${id}/`),
};

/* ─── Content ─────────────────────────────────────────────────────── */

export const contentService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<Content>>("/content/", { params }),
    get: (id: string) => api.get<Content>(`/content/${id}/`),
    create: (data: FormData) =>
        api.post<Content>("/content/", data, {
            headers: { "Content-Type": "multipart/form-data" },
        }),
    update: (id: string, data: Partial<Content>) =>
        api.patch<Content>(`/content/${id}/`, data),
    delete: (id: string) => api.delete(`/content/${id}/`),
    download: (id: string) => api.get(`/content/${id}/download/`),
    stats: (id: string) => api.get(`/content/${id}/stats/`),
    recent: () => api.get<Content[]>("/content/recent/"),
    search: (query: string) => api.get(`/content/search/`, { params: { q: query } }),
    folders: {
        list: (params?: Record<string, string>) =>
            api.get<PaginatedResponse<ContentFolder>>("/content/folders/", { params }),
        get: (id: string) => api.get<ContentFolder>(`/content/folders/${id}/`),
        create: (data: Partial<ContentFolder>) =>
            api.post<ContentFolder>("/content/folders/", data),
        update: (id: string, data: Partial<ContentFolder>) =>
            api.patch<ContentFolder>(`/content/folders/${id}/`, data),
        delete: (id: string) => api.delete(`/content/folders/${id}/`),
    },
    tags: {
        list: () => api.get<PaginatedResponse<ContentTag>>("/content/tags/"),
        create: (data: { name: string }) =>
            api.post<ContentTag>("/content/tags/", data),
    },
    bookmarks: {
        list: (params?: Record<string, string>) => api.get("/content/bookmarks/", { params }),
        add: (content_id: string) =>
            api.post("/content/bookmarks/", { content: content_id }),
        remove: (id: string) => api.delete(`/content/bookmarks/${id}/`),
    },
};

/* ─── Timetable ───────────────────────────────────────────────────── */

export const timetableService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<TimetableEntry>>("/timetable/", { params }),
    get: (id: string) => api.get<TimetableEntry>(`/timetable/${id}/`),
    create: (data: Partial<TimetableEntry>) =>
        api.post<TimetableEntry>("/timetable/", data),
    update: (id: string, data: Partial<TimetableEntry>) =>
        api.patch<TimetableEntry>(`/timetable/${id}/`, data),
    delete: (id: string) => api.delete(`/timetable/${id}/`),
    mine: () => api.get<TimetableEntry[]>("/timetable/me/"),
    conflicts: () => api.get("/timetable/conflicts/"),
    rooms: {
        list: (params?: Record<string, string>) =>
            api.get("/timetable/rooms/", { params }),
        get: (id: string) => api.get(`/timetable/rooms/${id}/`),
        create: (data: Record<string, unknown>) =>
            api.post("/timetable/rooms/", data),
        update: (id: string, data: Record<string, unknown>) =>
            api.patch(`/timetable/rooms/${id}/`, data),
        delete: (id: string) => api.delete(`/timetable/rooms/${id}/`),
    },
};

/* ─── Attendance ──────────────────────────────────────────────────── */

export const attendanceService = {
    markBulk: (data: {
        timetable_entry_id: string;
        date: string;
        records: Array<{ student_id: string; status: string; remarks?: string }>;
    }) => api.post("/attendance/mark/", data),
    export: () => api.get<Blob>("/attendance/export/", { responseType: "blob" }),
    edit: (id: string, data: Partial<AttendanceRecord>) =>
        api.patch(`/attendance/${id}/`, data),
    byCourse: (offeringId: string) =>
        api.get<PaginatedResponse<AttendanceRecord>>(`/attendance/course/${offeringId}/`),
    mine: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<AttendanceRecord>>("/attendance/me/", { params }),
    myCourse: (offeringId: string) =>
        api.get<PaginatedResponse<AttendanceRecord>>(`/attendance/me/${offeringId}/`),
    summary: (params?: Record<string, string>) =>
        api.get("/attendance/summary/", { params }),
    lowAlert: () =>
        api.get("/attendance/low-alert/"),
    report: (offeringId: string) =>
        api.get(`/attendance/report/${offeringId}/`),
};

export const roomBookingsService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<RoomBooking>>("/room-bookings/", { params }),
    get: (id: string) => api.get<RoomBooking>(`/room-bookings/${id}/`),
    create: (data: Partial<RoomBooking>) =>
        api.post<RoomBooking>("/room-bookings/", data),
    update: (id: string, data: Partial<RoomBooking>) =>
        api.patch<RoomBooking>(`/room-bookings/${id}/`, data),
    delete: (id: string) => api.delete(`/room-bookings/${id}/`),
    approve: (id: string, data: { status: "approved" | "rejected" }) =>
        api.patch(`/room-bookings/${id}/approve/`, data),
};

export const substituteFacultyService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<SubstituteFaculty>>("/substitute-faculty/", { params }),
    get: (id: string) => api.get<SubstituteFaculty>(`/substitute-faculty/${id}/`),
    create: (data: Partial<SubstituteFaculty>) =>
        api.post<SubstituteFaculty>("/substitute-faculty/", data),
    update: (id: string, data: Partial<SubstituteFaculty>) =>
        api.patch<SubstituteFaculty>(`/substitute-faculty/${id}/`, data),
    delete: (id: string) => api.delete(`/substitute-faculty/${id}/`),
};

/* ─── Communications ──────────────────────────────────────────────── */

export const announcementsService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<Announcement>>("/communications/announcements/", { params }),
    get: (id: string) =>
        api.get<Announcement>(`/communications/announcements/${id}/`),
    create: (data: Partial<Announcement> | FormData) =>
        api.post<Announcement>("/communications/announcements/", data),
    update: (id: string, data: Partial<Announcement> | FormData) =>
        api.patch<Announcement>(`/communications/announcements/${id}/`, data),
    delete: (id: string) =>
        api.delete(`/communications/announcements/${id}/`),
};

export const messagesService = {
    list: () =>
        api.get<PaginatedResponse<Message>>("/communications/messages/"),
    get: (id: string) => api.get<Message>(`/communications/messages/${id}/`),
    send: (data: { receiver: string; subject: string; body: string } | FormData) =>
        api.post<Message>("/communications/messages/", data),
};

export const forumsService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<DiscussionForum>>("/communications/forums/", { params }),
    get: (id: string) =>
        api.get<DiscussionForum & { posts: DiscussionPost[] }>(`/communications/forums/${id}/`),
    create: (data: { title: string; course_offering: string }) =>
        api.post<DiscussionForum>("/communications/forums/", data),
    createPost: (forumId: string, data: { body: string; parent?: string }) =>
        api.post<DiscussionPost>(`/communications/forums/${forumId}/posts/`, data),
    updatePost: (forumId: string, postId: string, data: { body?: string; is_resolved?: boolean }) =>
        api.patch<DiscussionPost>(`/communications/forums/${forumId}/posts/${postId}/`, data),
    deletePost: (forumId: string, postId: string) =>
        api.delete(`/communications/forums/${forumId}/posts/${postId}/delete/`),
    replies: (postId: string) =>
        api.get<PaginatedResponse<DiscussionPost>>(`/communications/posts/${postId}/replies/`),
};

/* ─── Notifications ───────────────────────────────────────────────── */

export const notificationsService = {
    list: () =>
        api.get<PaginatedResponse<Notification>>("/notifications/"),
    markRead: (id: string) => api.patch(`/notifications/${id}/read/`),
    markAllRead: () => api.post("/notifications/read-all/"),
    unreadCount: () => api.get("/notifications/unread-count/"),
    preferences: () => api.get("/notifications/preferences/"),
    createPreference: (data: Record<string, boolean>) =>
        api.post("/notifications/preferences/", data),
    updatePreference: (id: string, data: Record<string, boolean>) =>
        api.patch(`/notifications/preferences/${id}/`, data),
    adminStats: () => api.get("/notifications/admin/stats/"),
};

/* ─── Admin ───────────────────────────────────────────────────────── */

export const adminService = {
    dashboardStats: () => api.get("/admin/dashboard-stats/"),
    telemetryStats: () => api.get("/admin/telemetry/"),
    siteSettings: {
        get: () => api.get<SiteSettings>("/telemetry/site-settings/"),
        update: (data: Partial<SiteSettings>) => api.patch<SiteSettings>("/telemetry/site-settings/", data),
    },
};

/* ─── Audit Logs ──────────────────────────────────────────────────── */

export const auditLogsService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<AuditLog>>("/admin/audit-logs/", { params }),
};

/* ─── Academic Calendar ──────────────────────────────────────────── */

export const academicCalendarService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<AcademicEvent>>("/academics/calendar/", { params }),
    get: (id: string) => api.get<AcademicEvent>(`/academics/calendar/${id}/`),
    create: (data: Partial<AcademicEvent>) =>
        api.post<AcademicEvent>("/academics/calendar/", data),
    update: (id: string, data: Partial<AcademicEvent>) =>
        api.patch<AcademicEvent>(`/academics/calendar/${id}/`, data),
    delete: (id: string) => api.delete(`/academics/calendar/${id}/`),
};

/* ─── Class Cancellations ────────────────────────────────────────── */

export const classCancellationService = {
    list: () => api.get<ClassCancellation[]>("/timetable/cancellations/"),
    create: (data: {
        timetable_entry: string;
        original_date: string;
        action: "cancelled" | "rescheduled";
        reason?: string;
        new_date?: string;
        new_start_time?: string;
        new_end_time?: string;
        new_location?: string;
    }) => api.post<ClassCancellation>("/timetable/cancellations/", data),
};

/* ─── Content Versions & Comments ────────────────────────────────── */

export const contentVersionsService = {
    list: (contentId: string) =>
        api.get<PaginatedResponse<ContentVersion>>(`/content/${contentId}/versions/`),
    create: (contentId: string, data: FormData) =>
        api.post<ContentVersion>(`/content/${contentId}/versions/`, data, {
            headers: { "Content-Type": "multipart/form-data" },
        }),
};

export const contentCommentsService = {
    list: (contentId: string) =>
        api.get<PaginatedResponse<ContentComment>>(`/content/${contentId}/comments/`),
    create: (contentId: string, data: { body: string; parent?: string }) =>
        api.post<ContentComment>(`/content/${contentId}/comments/`, data),
    replies: (commentId: string) =>
        api.get<PaginatedResponse<ContentComment>>(`/content/comments/${commentId}/replies/`),
};

/* ─── Webhooks ───────────────────────────────────────────────────── */

export const webhooksService = {
    list: () => api.get<PaginatedResponse<WebhookEndpoint>>("/webhooks/"),
    get: (id: string) => api.get<WebhookEndpoint>(`/webhooks/${id}/`),
    create: (data: Partial<WebhookEndpoint> & { secret?: string }) =>
        api.post<WebhookEndpoint>("/webhooks/", data),
    update: (id: string, data: Partial<WebhookEndpoint>) =>
        api.patch<WebhookEndpoint>(`/webhooks/${id}/`, data),
    delete: (id: string) => api.delete(`/webhooks/${id}/`),
    deliveries: (id: string) =>
        api.get<PaginatedResponse<WebhookDelivery>>(`/webhooks/${id}/deliveries/`),
};

/* ─── Timetable Swaps ────────────────────────────────────────────── */

export const swapRequestsService = {
    list: () => api.get<TimetableSwapRequest[]>("/timetable/swap-requests/"),
    create: (data: { requester_entry: string; target_entry: string; message?: string }) =>
        api.post<TimetableSwapRequest>("/timetable/swap-requests/", data),
    respond: (id: string, action: "approve" | "reject") =>
        api.post(`/timetable/swap-requests/${id}/respond/`, { action }),
};


/* ─── Root ────────────────────────────────────────────────────────── */

export const rootService = {
    healthCheck: () => api.get("/"),
};
