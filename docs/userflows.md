# NimbusU — User Flows

> Complete interaction flows for all roles: **Admin**, **Faculty**, and **Student**.
> References: [API Documentation](./API.md) | [API Bridge](./api-bridge.md) | [Academic Workflow](./academic_workflow.md)

---

## 1. Authentication (All Roles)

### 1.1 Login
```
Login Page → Enter email + password → POST /auth/login/ → Store JWT tokens (access + refresh)
  ├─ Admin   → redirect to /admin/dashboard
  ├─ Faculty → redirect to /faculty/dashboard
  └─ Student → redirect to /student/dashboard

Token Refresh (automatic):
  401 response → POST /auth/refresh/ {refresh} → new access token → retry failed request
  Refresh fails → clear tokens → redirect to /login
```

### 1.2 Register (Student Self-Registration)
```
Register Page → Fill form (first_name, last_name, email, password, password_confirm, role)
  → POST /auth/register/
  → Store JWT tokens → redirect to role-based dashboard

Note: Self-registration can be disabled via Admin Settings → Site Settings → "Student Self-Registration" toggle.
```

### 1.3 Logout
```
Any Page → Click logout (sidebar or context menu)
  → POST /auth/logout/ {refresh} → blacklist refresh token
  → Clear stored tokens → redirect to /login
```

### 1.4 Change Password
```
Settings → Security tab → Enter current password + new password + confirm
  → Client-side validation (≥ 8 chars, passwords match)
  → POST /auth/password/change/ {old_password, new_password}
  → Success toast → clear form fields

Failure: displays specific error message from API response.
```

---

## 2. Admin Flows

### 2.1 Dashboard
```
/admin/dashboard
  ├─ Stats Cards: total users, active users, departments, courses
  ├─ Recent Activity: audit log feed
  ├─ Notification Stats: sent today / this week / delivery rate
  └─ Quick Actions: create user, create department, manage timetable
```

### 2.2 User Management
```
/admin/users
  ├─ Table: email, name, role, department, status, last login
  │    Row highlights: purple border = Dean, teal border = Head
  │    Hover on username → tooltip showing specific title (e.g., "Dean of School of Engineering")
  ├─ Filters: role, department, status + search bar
  ├─ Actions: Create, Edit (sheet), Deactivate, Reset Password
  └─ Click row → /admin/users/[id] → full profile + activity log

Create User:
  Dialog → Fill: email, password, first_name, last_name, role, department, phone
    → POST /users/ → refresh list

Edit User:
  Side sheet → Update fields → PATCH /users/{id}/ → refresh list

Deactivate User:
  User row → action menu → Deactivate → confirmation → DELETE /users/{id}/ (soft delete)

Reset Password:
  User row → action menu → Reset Password dialog → enter new password
    → POST /users/{id}/reset-password/ → success toast
```

### 2.3 Schools Management
```
/admin/schools
  ├─ Grid of school cards (name, dean name)
  ├─ Search: filter schools by name (debounced, 400ms)
  ├─ Create School: dialog → name + select dean (from Dean-role users)
  │    → POST → refresh grid
  ├─ Right-click card → context menu (Edit, Delete)
  ├─ Edit: dialog pre-filled → PATCH → refresh grid
  └─ Delete: confirmation → DELETE → remove from grid + toast
```

### 2.4 Department Management
```
/admin/departments
  ├─ Grid of department cards (name, code, head, parent school, course count)
  ├─ Create Department: dialog → name, code, head (from Head-role users), school
  │    → POST /departments/ → refresh grid
  ├─ Click card → /admin/departments/[id]
  │    ├─ Edit details
  │    ├─ Programs list → create/edit/archive programs
  │    └─ Courses list → view/edit
  └─ Delete → confirmation dialog → DELETE /departments/{id}/

Assign Head behaviour:
  Editing existing dept → dropdown only shows users with "Head" role
  Creating new dept → dropdown shows both Head-role and regular Faculty
```

### 2.5 Academic Management
```
/admin/academics
  ├─ Tab: Semesters | Courses | Offerings | Enrollments

  Semesters:
    ├─ List all semesters (name, academic_year, start/end dates, is_current)
    ├─ Create semester: name, academic_year, start_date, end_date
    │    → POST /academics/semesters/
    ├─ Set Current: → sets is_current flag
    └─ Filters: academic year, active status

  Courses:
    ├─ List courses (name, code, department, credits, is_active)
    ├─ Create: name, code, department, credits, description
    │    → POST /academics/courses/
    └─ Search: by name or code

  Offerings (linking a course to a semester + faculty):
    ├─ List offerings (course_name, semester, faculty, section, enrolled/max)
    ├─ Create: select course → semester → faculty → section → max_students
    │    → POST /academics/offerings/
    ├─ View students: GET /academics/offerings/{id}/students/
    └─ Filters: by course, semester, faculty

  Enrollments:
    ├─ List by offering → shows enrolled students
    ├─ Add student: POST /academics/enrollments/ {student, course_offering}
    └─ Remove student: DELETE /academics/enrollments/{id}/

  Programs:
    ├─ List programs (name, code, department, degree_type, duration)
    ├─ Create: name, code, department, duration_years, degree_type
    │    → POST /academics/programs/
    └─ Filters: department, degree_type (UG/PG/PhD/Diploma), is_active
```

### 2.6 Timetable Management
```
/admin/timetable
  ├─ Weekly grid view (Mon–Sat × time slots)
  ├─ Filter by: department, semester, room
  ├─ Create Entry:
  │    Select course offering → room → day_of_week → start_time → end_time → semester
  │    → POST /timetable/ → refresh grid
  ├─ Conflict Detection: GET /timetable/conflicts/?semester=UUID
  │    → highlights room conflicts and faculty double-bookings
  └─ Room Management:
       /admin/timetable/rooms
       ├─ List rooms (name, building, capacity, type, is_available)
       ├─ Create: name, building, capacity, room_type (classroom/lab/auditorium/conference)
       │    → POST /timetable/rooms/
       └─ Filters: room_type, is_available
```

### 2.7 Content Oversight
```
/admin/content
  ├─ All content list with filters (content_type, visibility, folder, search)
  ├─ Content stats per item: GET /content/{id}/stats/ → views, downloads, unique users
  └─ Tag management: GET/POST /content/tags/ → create/list tags
```

### 2.8 Announcements
```
/admin/announcements
  ├─ List announcements (title, target_type, is_urgent, published date)
  ├─ Create: title, body, target_type (all/department/course/section),
  │    target_id, is_urgent toggle, publish_at, expires_at
  │    → POST /communications/announcements/
  ├─ Edit → PATCH /communications/announcements/{id}/
  └─ Delete → DELETE /communications/announcements/{id}/
```

### 2.9 Audit Logs
```
/admin/audit-logs
  ├─ Filterable table: user_email, action, entity_type, entity_id, date range, ip_address
  │    → GET /admin/audit-logs/
  └─ Export to CSV
```

### 2.10 Notification Stats (Admin)
```
/admin/notifications
  ├─ Notification delivery stats → GET /notifications/admin/stats/
  └─ View: total sent (daily/weekly/monthly), delivery rates, failure reasons
```

---

## 3. Faculty Flows

### 3.1 Dashboard
```
/faculty/dashboard
  ├─ Today's Schedule: current day timetable entries
  ├─ Quick Stats: courses teaching, pending submissions, unread messages
  ├─ Recent Assignments: submissions waiting for grading
  └─ Announcements feed
```

### 3.2 My Courses
```
/faculty/courses → list of assigned course offerings (current semester)
  → GET /academics/offerings/?faculty={my_id}
  └─ Click course → /faculty/courses/[offering_id]
       ├─ Tab: Overview | Content | Assignments | Students | Attendance | Forum
       ├─ Overview: course info, enrolled count, schedule
       ├─ Content: folder tree + upload content
       ├─ Assignments: create / list / view submissions
       ├─ Students: enrolled student list → GET /academics/offerings/{id}/students/
       ├─ Attendance: mark attendance (bulk), view reports
       └─ Forum: discussion threads
```

### 3.3 Content Management
```
Upload Content:
  Course page → Content tab → Upload button
    → Fill: title, content_type, description, file/external_url, folder, visibility, tags
    → Optional: publish_at, expires_at, is_published
    → POST /content/ (multipart/form-data) → appears in folder

Organize:
  Create folders → POST /content/folders/ {name, parent, course_offering, visibility}
  Move content into folders
  Edit content metadata → PATCH /content/{id}/
  Delete content → DELETE /content/{id}/

View Stats:
  Content item → GET /content/{id}/stats/ → total views, downloads, unique users
```

### 3.4 Assignment & Grading
```
Create Assignment:
  Course → Assignments tab → New Assignment
    → Title, description, due_date, max_marks, assignment_type (assignment/quiz/exam/project)
    → Attachments (optional), is_published toggle
    → POST /assignments/ → appears in list

View Submissions:
  Assignment → Submissions tab → GET /assignments/{id}/submissions/
    → List all submissions (student_name, submitted_at, status, marks)
    → Click submission → view file + text_content

Grade Submission:
  Submission detail → enter marks_obtained, grade, feedback
    → POST /assignments/{id}/submissions/{sub_id}/grade/
    → Status updates to "graded"

Export Grades:
  Course → Assignments tab → Export
    → GET /assignments/export/{offering_id}/ → Download CSV
```

### 3.5 Attendance
```
Mark Attendance:
  Course → Attendance tab → Select timetable entry → Pick date
    → Student checklist: present / absent / late / excused
    → POST /attendance/mark/ (bulk: timetable_entry_id, date, records[])

View Reports:
  Course → Attendance tab → Report view
    → GET /attendance/course/{offering_id}/
    → Per-student: total classes, attended, percentage

Edit Record:
  → PATCH /attendance/{id}/ {status, remarks}
```

### 3.6 Timetable
```
/faculty/timetable → GET /timetable/me/
  → Weekly/daily view of teaching schedule with room info, day, times
```

### 3.7 Communication
```
Messages:
  /faculty/messages → GET /communications/messages/
    ├─ Inbox / Sent tabs
    ├─ Compose → select recipient → subject + body → POST /communications/messages/
    └─ Click message → view → auto-mark read

Announcements:
  /faculty/announcements
    → Create course-level announcement
    → POST /communications/announcements/ {target_type: "course", target_id: offering_id, ...}

Discussion Forums:
  Course → Forum tab
    ├─ List forums → GET /communications/forums/?course_offering=UUID
    ├─ Create forum → POST /communications/forums/ {title, course_offering}
    ├─ View forum + posts → GET /communications/forums/{id}/
    ├─ Create post → POST /communications/forums/{id}/posts/ {body, parent?}
    ├─ Edit own post → PATCH /communications/forums/{forum_id}/posts/{id}/
    └─ Delete own post → DELETE /communications/forums/{forum_id}/posts/{id}/delete/
```

---

## 4. Student Flows

### 4.1 Dashboard
```
/student/dashboard
  ├─ Today's Classes: timetable for today
  ├─ Upcoming Deadlines: assignments due soon
  ├─ Recent Content: newly uploaded materials → GET /content/recent/
  ├─ Notifications: unread count + recent list
  └─ Attendance Summary: overall attendance %
```

### 4.2 My Courses
```
/student/courses → GET /academics/enrollments/me/ → list enrolled courses
  └─ Click course → /student/courses/[offering_id]
       ├─ Tab: Overview | Content | Assignments | Attendance | Forum
       ├─ Overview: course info, faculty name, schedule
       ├─ Content: browse folder tree → click item → view + download
       │    Download → GET /content/{id}/download/ → auto-logs access
       ├─ Assignments: list → view details → submit work → view grade + feedback
       ├─ Attendance: personal attendance for this course
       │    → GET /attendance/me/{offering_id}/
       └─ Forum: read + participate in discussions
            → POST /communications/forums/{id}/posts/ {body, parent?}
```

### 4.3 Content Browsing
```
/student/content
  ├─ Browse all accessible content
  │    Filters: course_offering, content_type (document/video/image/link), tags, visibility
  ├─ Search bar → full-text search (search= query param)
  ├─ Click item → view details → GET /content/{id}/ (logs a view)
  │    → Download → GET /content/{id}/download/ (logs the download)
  └─ Bookmark → POST /content/bookmarks/ {content: UUID}

/student/bookmarks → GET /content/bookmarks/ → saved content list
  └─ Remove → DELETE /content/bookmarks/{id}/
```

### 4.4 Assignments
```
/student/assignments → All assignments across enrolled courses

View Assignment:
  Course → Assignments tab → click assignment
    → GET /assignments/{id}/
    → Details: title, description, due_date, attachments, max_marks, assignment_type

Submit Work:
  Assignment detail → Submit tab
    → Upload file and/or enter text_content
    → POST /assignments/{id}/submit/ (multipart/form-data)

View Grade:
  Course → Assignments tab → assignment → My Submission
    → GET /assignments/{id}/submissions/me/
    → Shows: marks_obtained, grade, feedback, status (submitted/graded)
```

### 4.5 Timetable
```
/student/timetable → GET /timetable/me/
  → Weekly/daily view with class times, rooms, faculty names
```

### 4.6 Attendance
```
/student/attendance → GET /attendance/me/
  → Overall summary: per-course breakdown (total_classes, attended, percentage)
  → Click course → GET /attendance/me/{offering_id}/
  → Detailed records with dates and status (present/absent/late/excused)
```

### 4.7 Notifications
```
/student/notifications → GET /notifications/
  ├─ List: title, message, notification_type, timestamp, read/unread, status
  ├─ Click → mark as read → POST /notifications/{id}/read/
  ├─ Mark All Read → POST /notifications/read-all/
  └─ Bell icon (header) → badge with unread count → GET /notifications/unread-count/
```

### 4.8 Messages
```
/student/messages → GET /communications/messages/
  ├─ Inbox / Sent tabs
  ├─ Compose → select faculty → subject + body → POST /communications/messages/
  └─ Click message → GET /communications/messages/{id}/ → auto-mark read
```

### 4.9 Announcements
```
/student/announcements → GET /communications/announcements/
  ├─ List: title, body, created_by_name, target_type, is_urgent, dates
  └─ Filters: target_type, is_urgent, search
```

---

## 5. Settings (All Roles)

```
/settings → Sidebar navigation with sections (desktop: vertical sidebar, mobile: horizontal scrollable nav)
```

### 5.1 Profile (All Roles)
```
  ├─ Avatar: preview + upload (JPG/PNG/GIF, max 2MB)
  │    → POST /users/me/avatar/ (multipart/form-data)
  ├─ Editable: first_name, last_name, phone
  ├─ Read-only: email (requires admin to change), role
  └─ Save → PATCH /users/me/ {first_name, last_name, phone}
```

### 5.2 Security (All Roles)
```
  ├─ Change Password: current + new + confirm
  │    → POST /auth/password/change/ {old_password, new_password}
  └─ Active Sessions: view current session, sign out all others
```

### 5.3 Notifications (All Roles)
```
  ├─ Toggle switches for:
  │    Email Notifications, Assignment Reminders,
  │    Announcements, Timetable Changes, Direct Messages
  └─ Preferences API: GET/PATCH /notifications/preferences/
```

### 5.4 Appearance (All Roles)
```
  ├─ Theme: Light/Dark toggle (Ctrl+T shortcut, or via sidebar)
  ├─ Calendar View: default view on load (Month / Week / Day)
  └─ Sidebar: Compact Mode toggle (collapse by default)
```

### 5.5 Language & Region (All Roles)
```
  ├─ Language: English, Hindi, Tamil, Telugu
  ├─ Timezone: Asia/Kolkata (IST), UTC, US/Eastern, Europe/London
  └─ Date Format: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
```

### 5.6 Site Settings (Admin Only)
```
  ├─ Institution Name, Support Email, Academic Year
  └─ Feature Toggles:
       ├─ Student Self-Registration (on/off)
       ├─ File Uploads (on/off)
       └─ Forum Discussions (on/off)
```

### 5.7 Permissions (Admin Only)
```
  ├─ Role overview: Admin, Dean, Head, Faculty, Student
  │    Each shows: permission summary, user count
  └─ Click role → manage role details
```

---

## 6. Shared Components

| Component | Usage |
|-----------|-------|
| **Sidebar** | Role-based navigation (collapses on mobile). Includes theme toggle and logout. |
| **Header** | User avatar, notifications bell (unread badge), search, settings gear |
| **Searchable Context Menu** | Right-click anywhere → searchable navigation + quick actions (theme toggle, logout) with keyboard shortcuts |
| **Data Table** | Paginated (default 20/page), sortable, filterable lists with search |
| **Dialog/Sheet** | Create/edit forms overlay (dialogs for small forms, side sheets for detailed edits) |
| **Toast** | Success/error notifications (Sonner) |
| **Calendar View** | Timetable weekly grid (Mon–Sat) |
| **File Upload** | Drag & drop with progress indicator. Max 2MB for avatars, 100MB for content. |
| **Markdown Editor** | Assignment descriptions, forum posts |
| **Stats Card** | Dashboard metric display |
| **Breadcrumbs** | Navigation path |
| **Skeleton Loaders** | Loading states for data-heavy pages |
| **Context Menu** | Right-click on items (e.g., school cards) for quick edit/delete actions |

---

## 7. Role Hierarchy & Permissions

| Role | Scope | Key Capabilities |
|------|-------|-------------------|
| **Admin** | System-wide | Full CRUD on all entities, user management, site settings, audit logs |
| **Dean** | School-level | School management, faculty oversight within their school |
| **Head** | Department-level | Department management, course management within their department |
| **Faculty** | Course-level | Content upload, assignments, grading, attendance, forums, announcements |
| **Student** | Personal | View content, submit assignments, view grades/attendance, messages, forums |

---

## 8. Academic Hierarchy

```
University
  └─ Schools (e.g., School of Engineering, School of Arts)
       └─ Departments (e.g., Computer Science, Mechanical Engineering)
            └─ Programs (e.g., B.Tech CS, M.Tech CS — with degree_type: UG/PG/PhD/Diploma)
                 └─ Courses (e.g., Data Structures CS201 — with credits)
                      └─ Offerings (Course + Semester + Faculty + Section)
                           └─ Enrollments (Student ↔ Offering)
```

---

## 9. Page Map

| Route | Role | Page |
|-------|------|------|
| `/login` | Public | Login |
| `/register` | Public | Register |
| `/admin/dashboard` | Admin | Dashboard |
| `/admin/users` | Admin | User Management |
| `/admin/schools` | Admin | Schools Management |
| `/admin/departments` | Admin | Departments |
| `/admin/academics` | Admin | Semesters, Courses, Offerings, Enrollments, Programs |
| `/admin/timetable` | Admin | Timetable Editor + Room Management |
| `/admin/content` | Admin | Content Oversight |
| `/admin/announcements` | Admin | Announcements |
| `/admin/audit-logs` | Admin | Audit Logs |
| `/admin/notifications` | Admin | Notification Stats |
| `/faculty/dashboard` | Faculty | Dashboard |
| `/faculty/courses` | Faculty | My Courses |
| `/faculty/courses/[id]` | Faculty | Course Detail (tabs: Overview, Content, Assignments, Students, Attendance, Forum) |
| `/faculty/timetable` | Faculty | My Schedule |
| `/faculty/messages` | Faculty | Messages |
| `/faculty/announcements` | Faculty | My Announcements |
| `/student/dashboard` | Student | Dashboard |
| `/student/courses` | Student | My Courses |
| `/student/courses/[id]` | Student | Course Detail (tabs: Overview, Content, Assignments, Attendance, Forum) |
| `/student/content` | Student | Content Browser |
| `/student/bookmarks` | Student | Bookmarks |
| `/student/timetable` | Student | My Schedule |
| `/student/attendance` | Student | Attendance Records |
| `/student/assignments` | Student | All Assignments |
| `/student/messages` | Student | Messages |
| `/student/announcements` | Student | Announcements |
| `/student/notifications` | Student | Notifications |
| `/settings` | All | Settings (Profile, Security, Notifications, Appearance, Language, Site, Permissions) |
