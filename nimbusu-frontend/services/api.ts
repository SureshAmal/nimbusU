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
} from "@/lib/types";

/* ─── Users ───────────────────────────────────────────────────────── */

export const usersService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<User>>("/users/", { params }),
    get: (id: string) => api.get<User>(`/users/${id}/`),
    create: (data: Partial<User> & { password: string }) =>
        api.post<User>("/users/", data),
    update: (id: string, data: Partial<User>) =>
        api.patch<User>(`/users/${id}/`, data),
    delete: (id: string) => api.delete(`/users/${id}/`),
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
};

/* ─── Schools ─────────────────────────────────────────────────────── */

export const schoolsService = {
    list: () => api.get<PaginatedResponse<School>>("/academics/schools/"),
    get: (id: string) => api.get<School>(`/academics/schools/${id}/`),
    create: (data: Partial<School>) =>
        api.post<School>("/academics/schools/", data),
    update: (id: string, data: Partial<School>) =>
        api.patch<School>(`/academics/schools/${id}/`, data),
    delete: (id: string) => api.delete(`/academics/schools/${id}/`),
};

/* ─── Departments ─────────────────────────────────────────────────── */

export const departmentsService = {
    list: () => api.get<PaginatedResponse<Department>>("/departments/"),
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
    list: () => api.get<PaginatedResponse<Semester>>("/academics/semesters/"),
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
        api.post<Enrollment>("/academics/enrollments/", data),
    mine: () =>
        api.get<PaginatedResponse<Enrollment>>("/academics/enrollments/me/"),
    delete: (id: string) => api.delete(`/academics/enrollments/${id}/`),
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
    folders: {
        list: (params?: Record<string, string>) =>
            api.get<PaginatedResponse<ContentFolder>>("/content/folders/", { params }),
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
        list: () => api.get("/content/bookmarks/"),
        add: (content_id: string) =>
            api.post("/content/bookmarks/", { content: content_id }),
        remove: (id: string) => api.delete(`/content/bookmarks/${id}/`),
    },
};

/* ─── Timetable ───────────────────────────────────────────────────── */

export const timetableService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<TimetableEntry>>("/timetable/", { params }),
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
    edit: (id: string, data: Partial<AttendanceRecord>) =>
        api.patch(`/attendance/${id}/`, data),
    byCourse: (offeringId: string) =>
        api.get<PaginatedResponse<AttendanceRecord>>(`/attendance/course/${offeringId}/`),
    mine: () =>
        api.get<PaginatedResponse<AttendanceRecord>>("/attendance/me/"),
    myCourse: (offeringId: string) =>
        api.get<PaginatedResponse<AttendanceRecord>>(`/attendance/me/${offeringId}/`),
};

/* ─── Communications ──────────────────────────────────────────────── */

export const announcementsService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<Announcement>>("/communications/announcements/", { params }),
    get: (id: string) =>
        api.get<Announcement>(`/communications/announcements/${id}/`),
    create: (data: Partial<Announcement>) =>
        api.post<Announcement>("/communications/announcements/", data),
    update: (id: string, data: Partial<Announcement>) =>
        api.patch<Announcement>(`/communications/announcements/${id}/`, data),
    delete: (id: string) =>
        api.delete(`/communications/announcements/${id}/`),
};

export const messagesService = {
    list: () =>
        api.get<PaginatedResponse<Message>>("/communications/messages/"),
    get: (id: string) => api.get<Message>(`/communications/messages/${id}/`),
    send: (data: { receiver: string; subject: string; body: string }) =>
        api.post<Message>("/communications/messages/", data),
};

export const forumsService = {
    list: (params?: Record<string, string>) =>
        api.get("/communications/forums/", { params }),
    get: (id: string) => api.get(`/communications/forums/${id}/`),
    create: (data: { title: string; course_offering: string }) =>
        api.post("/communications/forums/", data),
    createPost: (forumId: string, data: { body: string; parent?: string }) =>
        api.post(`/communications/forums/${forumId}/posts/`, data),
};

/* ─── Notifications ───────────────────────────────────────────────── */

export const notificationsService = {
    list: () =>
        api.get<PaginatedResponse<Notification>>("/notifications/"),
    markRead: (id: string) => api.patch(`/notifications/${id}/read/`),
    markAllRead: () => api.post("/notifications/read-all/"),
    unreadCount: () => api.get("/notifications/unread-count/"),
    preferences: () => api.get("/notifications/preferences/"),
    updatePreference: (id: string, data: Record<string, boolean>) =>
        api.patch(`/notifications/preferences/${id}/`, data),
    adminStats: () => api.get("/notifications/admin/stats/"),
};

/* ─── Audit Logs ──────────────────────────────────────────────────── */

export const auditLogsService = {
    list: (params?: Record<string, string>) =>
        api.get<PaginatedResponse<AuditLog>>("/admin/audit-logs/", { params }),
};
