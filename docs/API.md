# NimbusU API Documentation

**Version:** 1.0  
**Base URL:** `/api/v1/`  
**Authentication:** JWT Bearer Token

## Table of Contents

1. [Authentication](#authentication)
2. [Users & Accounts](#users--accounts)
3. [Academics](#academics)
4. [Assignments](#assignments)
5. [Content Management](#content-management)
6. [Timetable & Attendance](#timetable--attendance)
7. [Communications](#communications)
8. [Common Response Formats](#common-response-formats)

---

## Authentication

### Register User
**POST** `/api/v1/auth/register/`

Creates a new user account.

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email address |
| password | string | Yes | Minimum 8 characters |
| password_confirm | string | Yes | Must match password |
| first_name | string | Yes | User's first name |
| last_name | string | Yes | User's last name |
| role | string | Yes | One of: `admin`, `faculty`, `student` |

**Example Request:**
```json
{
  "email": "john.doe@university.edu",
  "password": "SecurePass123!",
  "password_confirm": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "role": "student"
}
```

**Example Response:** `201 Created`
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@university.edu",
      "first_name": "John",
      "last_name": "Doe",
      "role": "student",
      "department": null,
      "department_name": null,
      "profile_picture": null,
      "phone": null,
      "is_active": true,
      "last_login": null,
      "created_at": "2026-03-02T10:30:00Z",
      "updated_at": "2026-03-02T10:30:00Z",
      "student_profile": null,
      "faculty_profile": null
    },
    "tokens": {
      "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
      "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
    }
  }
}
```

---

### Login
**POST** `/api/v1/auth/login/`

Authenticates a user and returns JWT tokens.

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User's email |
| password | string | Yes | User's password |

**Example Request:**
```json
{
  "email": "john.doe@university.edu",
  "password": "SecurePass123!"
}
```

**Example Response:** `200 OK`
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

---

### Refresh Token
**POST** `/api/v1/auth/refresh/`

Refreshes an access token using a refresh token.

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| refresh | string | Yes | Valid refresh token |

**Example Request:**
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Example Response:** `200 OK`
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

---

### Logout
**POST** `/api/v1/auth/logout/`

Blacklists the refresh token.

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| refresh | string | Yes | Refresh token to blacklist |

**Example Request:**
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Example Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Logged out."
}
```

---

### Change Password
**POST** `/api/v1/auth/password/change/`

Changes the current user's password.

**Authentication Required:** Yes

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| old_password | string | Yes | Current password |
| new_password | string | Yes | New password (min 8 chars) |

**Example Request:**
```json
{
  "old_password": "OldPassword123!",
  "new_password": "NewPassword456!"
}
```

**Example Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Password changed."
}
```

---

## Users & Accounts

### List Users
**GET** `/api/v1/users/`

Lists all users (Admin only).

**Authentication Required:** Yes (Admin only)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| role | string | Filter by role: `admin`, `faculty`, `student` |
| department | UUID | Filter by department ID |
| is_active | boolean | Filter by active status |
| search | string | Search by email, first name, or last name |
| ordering | string | Order by: `created_at`, `email`, `first_name` |

**Example Request:**
```
GET /api/v1/users/?role=student&department=550e8400-e29b-41d4-a716-446655440000
```

**Example Response:** `200 OK`
```json
{
  "count": 50,
  "next": "/api/v1/users/?page=2",
  "previous": null,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@university.edu",
      "first_name": "John",
      "last_name": "Doe",
      "role": "student",
      "department": "650e8400-e29b-41d4-a716-446655440000",
      "department_name": "Computer Science",
      "phone": "+1234567890",
      "is_active": true,
      "last_login": "2026-03-02T09:15:00Z",
      "created_at": "2026-01-15T10:30:00Z"
    }
  ]
}
```

---

### Create User
**POST** `/api/v1/users/`

Creates a new user (Admin only).

**Authentication Required:** Yes (Admin only)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email address |
| password | string | Yes | Minimum 8 characters |
| first_name | string | Yes | User's first name |
| last_name | string | Yes | User's last name |
| role | string | Yes | One of: `admin`, `faculty`, `student` |
| department | UUID | No | Department ID |
| phone | string | No | Contact phone number |

**Example Request:**
```json
{
  "email": "jane.smith@university.edu",
  "password": "SecurePass123!",
  "first_name": "Jane",
  "last_name": "Smith",
  "role": "faculty",
  "department": "650e8400-e29b-41d4-a716-446655440000",
  "phone": "+1234567891"
}
```

**Example Response:** `201 Created`
```json
{
  "id": "760e8400-e29b-41d4-a716-446655440000",
  "email": "jane.smith@university.edu",
  "first_name": "Jane",
  "last_name": "Smith",
  "role": "faculty",
  "department": "650e8400-e29b-41d4-a716-446655440000",
  "phone": "+1234567891"
}
```

---

### Get Current User
**GET** `/api/v1/users/me/`

Retrieves the authenticated user's profile.

**Authentication Required:** Yes

**Example Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@university.edu",
  "first_name": "John",
  "last_name": "Doe",
  "role": "student",
  "department": "650e8400-e29b-41d4-a716-446655440000",
  "department_name": "Computer Science",
  "profile_picture": "/media/avatars/john_doe.jpg",
  "phone": "+1234567890",
  "is_active": true,
  "failed_login_attempts": 0,
  "last_login": "2026-03-02T09:15:00Z",
  "created_at": "2026-01-15T10:30:00Z",
  "updated_at": "2026-03-02T09:15:00Z",
  "student_profile": {
    "id": "850e8400-e29b-41d4-a716-446655440000",
    "student_id_number": "CS2024001",
    "program": "950e8400-e29b-41d4-a716-446655440000",
    "current_semester": 4,
    "admission_date": "2024-08-15",
    "batch_year": 2024
  },
  "faculty_profile": null
}
```

---

### Update Current User
**PATCH** `/api/v1/users/me/`

Updates the authenticated user's profile.

**Authentication Required:** Yes

**Request Body (all fields optional):**
| Field | Type | Description |
|-------|------|-------------|
| first_name | string | User's first name |
| last_name | string | User's last name |
| phone | string | Contact phone number |

**Example Request:**
```json
{
  "phone": "+1234567899"
}
```

**Example Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@university.edu",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567899",
  ...
}
```

---

### Upload Avatar
**POST** `/api/v1/users/me/avatar/`

Uploads a profile picture for the authenticated user.

**Authentication Required:** Yes

**Request Body (multipart/form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| avatar | file | Yes | Image file (JPEG, PNG) |

**Example Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "profile_picture": "/media/avatars/john_doe_2026.jpg"
  }
}
```

---

### Get User by ID
**GET** `/api/v1/users/{user_id}/`

Retrieves a user by ID (Admin only).

**Authentication Required:** Yes (Admin only)

**Example Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@university.edu",
  "first_name": "John",
  "last_name": "Doe",
  ...
}
```

---

### Update User
**PATCH** `/api/v1/users/{user_id}/`

Updates a user by ID (Admin only).

**Authentication Required:** Yes (Admin only)

**Request Body (all fields optional):**
| Field | Type | Description |
|-------|------|-------------|
| first_name | string | User's first name |
| last_name | string | User's last name |
| role | string | User's role |
| department | UUID | Department ID |
| phone | string | Contact phone number |
| is_active | boolean | Active status |

---

### Delete User (Soft)
**DELETE** `/api/v1/users/{user_id}/`

Soft deletes a user (sets is_active to false).

**Authentication Required:** Yes (Admin only)

**Example Response:** `204 No Content`

---

### Reset User Password
**POST** `/api/v1/users/{user_id}/reset-password/`

Admin resets a user's password.

**Authentication Required:** Yes (Admin only)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| new_password | string | Yes | New password (min 8 chars) |

**Example Request:**
```json
{
  "new_password": "NewPassword123!"
}
```

**Example Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Password reset successfully."
}
```

---

### List Audit Logs
**GET** `/api/v1/admin/audit-logs/`

Lists all audit logs (Admin only).

**Authentication Required:** Yes (Admin only)

**Example Response:** `200 OK`
```json
{
  "count": 100,
  "results": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440000",
      "user": "550e8400-e29b-41d4-a716-446655440000",
      "user_email": "admin@university.edu",
      "action": "USER_CREATED",
      "entity_type": "User",
      "entity_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "details": {"role": "student"},
      "ip_address": "192.168.1.1",
      "created_at": "2026-03-02T10:30:00Z"
    }
  ]
}
```

---

## Academics

### List Departments
**GET** `/api/v1/departments/`

Lists all departments.

**Authentication Required:** Yes

**Example Response:** `200 OK`
```json
{
  "count": 10,
  "results": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440000",
      "name": "Computer Science",
      "code": "CS",
      "head": "760e8400-e29b-41d4-a716-446655440000",
      "head_name": "Dr. Jane Smith",
      "created_at": "2025-01-10T08:00:00Z"
    }
  ]
}
```

---

### Create Department
**POST** `/api/v1/departments/`

Creates a new department (Admin only).

**Authentication Required:** Yes (Admin only)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Department name |
| code | string | Yes | Department code (unique) |
| head | UUID | No | Department head user ID |

**Example Request:**
```json
{
  "name": "Computer Science",
  "code": "CS",
  "head": "760e8400-e29b-41d4-a716-446655440000"
}
```

**Example Response:** `201 Created`
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440000",
  "name": "Computer Science",
  "code": "CS",
  "head": "760e8400-e29b-41d4-a716-446655440000",
  "head_name": "Dr. Jane Smith",
  "created_at": "2026-03-02T10:30:00Z"
}
```

---

### Get Department
**GET** `/api/v1/departments/{department_id}/`

Retrieves a department by ID.

**Authentication Required:** Yes

---

### Update Department
**PATCH** `/api/v1/departments/{department_id}/`

Updates a department (Admin only).

**Authentication Required:** Yes (Admin only)

---

### Delete Department
**DELETE** `/api/v1/departments/{department_id}/`

Deletes a department (Admin only).

**Authentication Required:** Yes (Admin only)

---

### List Programs
**GET** `/api/v1/academics/programs/`

Lists all academic programs.

**Authentication Required:** Yes

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| department | UUID | Filter by department ID |
| degree_type | string | Filter by: `UG`, `PG`, `PhD`, `Diploma` |
| is_active | boolean | Filter by active status |

**Example Response:** `200 OK`
```json
{
  "count": 15,
  "results": [
    {
      "id": "950e8400-e29b-41d4-a716-446655440000",
      "name": "Bachelor of Technology in Computer Science",
      "code": "BTECHCS",
      "department": "650e8400-e29b-41d4-a716-446655440000",
      "department_name": "Computer Science",
      "duration_years": 4,
      "degree_type": "UG",
      "is_active": true
    }
  ]
}
```

---

### Create Program
**POST** `/api/v1/academics/programs/`

Creates a new program (Admin only).

**Authentication Required:** Yes (Admin only)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Program name |
| code | string | Yes | Program code (unique) |
| department | UUID | Yes | Department ID |
| duration_years | integer | Yes | Program duration in years |
| degree_type | string | Yes | One of: `UG`, `PG`, `PhD`, `Diploma` |
| is_active | boolean | No | Active status (default: true) |

**Example Request:**
```json
{
  "name": "Bachelor of Technology in Computer Science",
  "code": "BTECHCS",
  "department": "650e8400-e29b-41d4-a716-446655440000",
  "duration_years": 4,
  "degree_type": "UG",
  "is_active": true
}
```

---

### List Semesters
**GET** `/api/v1/academics/semesters/`

Lists all academic semesters.

**Authentication Required:** Yes

**Example Response:** `200 OK`
```json
{
  "count": 8,
  "results": [
    {
      "id": "a50e8400-e29b-41d4-a716-446655440000",
      "name": "Spring 2026",
      "academic_year": "2025-2026",
      "start_date": "2026-01-10",
      "end_date": "2026-05-15",
      "is_current": true
    }
  ]
}
```

---

### Get Current Semester
**GET** `/api/v1/academics/semesters/current/`

Retrieves the current active semester.

**Authentication Required:** Yes

**Example Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "id": "a50e8400-e29b-41d4-a716-446655440000",
    "name": "Spring 2026",
    "academic_year": "2025-2026",
    "start_date": "2026-01-10",
    "end_date": "2026-05-15",
    "is_current": true
  }
}
```

---

### List Courses
**GET** `/api/v1/academics/courses/`

Lists all courses.

**Authentication Required:** Yes

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| department | UUID | Filter by department ID |
| is_active | boolean | Filter by active status |
| search | string | Search by name or code |

**Example Response:** `200 OK`
```json
{
  "count": 50,
  "results": [
    {
      "id": "b50e8400-e29b-41d4-a716-446655440000",
      "name": "Data Structures and Algorithms",
      "code": "CS201",
      "department": "650e8400-e29b-41d4-a716-446655440000",
      "department_name": "Computer Science",
      "credits": 4,
      "description": "Introduction to fundamental data structures and algorithms.",
      "is_active": true
    }
  ]
}
```

---

### Create Course
**POST** `/api/v1/academics/courses/`

Creates a new course (Admin only).

**Authentication Required:** Yes (Admin only)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Course name |
| code | string | Yes | Course code (unique) |
| department | UUID | Yes | Department ID |
| credits | integer | Yes | Number of credits |
| description | string | No | Course description |
| is_active | boolean | No | Active status (default: true) |

---

### List Course Offerings
**GET** `/api/v1/academics/offerings/`

Lists all course offerings for the current semester.

**Authentication Required:** Yes

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| course | UUID | Filter by course ID |
| semester | UUID | Filter by semester ID |
| faculty | UUID | Filter by faculty user ID |

**Example Response:** `200 OK`
```json
{
  "count": 25,
  "results": [
    {
      "id": "c50e8400-e29b-41d4-a716-446655440000",
      "course": "b50e8400-e29b-41d4-a716-446655440000",
      "course_name": "Data Structures and Algorithms",
      "course_code": "CS201",
      "semester": "a50e8400-e29b-41d4-a716-446655440000",
      "semester_name": "Spring 2026",
      "faculty": "760e8400-e29b-41d4-a716-446655440000",
      "faculty_name": "Dr. Jane Smith",
      "section": "A",
      "max_students": 60,
      "enrolled_count": 45
    }
  ]
}
```

---

### Create Course Offering
**POST** `/api/v1/academics/offerings/`

Creates a new course offering (Admin only).

**Authentication Required:** Yes (Admin only)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| course | UUID | Yes | Course ID |
| semester | UUID | Yes | Semester ID |
| faculty | UUID | Yes | Faculty user ID |
| section | string | No | Section (default: "A") |
| max_students | integer | No | Max enrollment (default: 60) |

---

### Get Course Offering Students
**GET** `/api/v1/academics/offerings/{offering_id}/students/`

Lists all students enrolled in a course offering.

**Authentication Required:** Yes (Admin or Faculty)

**Example Response:** `200 OK`
```json
{
  "status": "success",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@university.edu",
      "first_name": "John",
      "last_name": "Doe",
      "role": "student",
      "department": "650e8400-e29b-41d4-a716-446655440000",
      "department_name": "Computer Science",
      "phone": "+1234567890",
      "is_active": true
    }
  ]
}
```

---

### Create Enrollment
**POST** `/api/v1/academics/enrollments/`

Enrolls a student in a course offering.

**Authentication Required:** Yes

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| student | UUID | Yes | Student user ID |
| course_offering | UUID | Yes | Course offering ID |

**Example Request:**
```json
{
  "student": "550e8400-e29b-41d4-a716-446655440000",
  "course_offering": "c50e8400-e29b-41d4-a716-446655440000"
}
```

**Example Response:** `201 Created`
```json
{
  "id": "d50e8400-e29b-41d4-a716-446655440000",
  "student": "550e8400-e29b-41d4-a716-446655440000",
  "student_name": "John Doe",
  "course_offering": "c50e8400-e29b-41d4-a716-446655440000",
  "course_name": "Data Structures and Algorithms",
  "enrolled_at": "2026-03-02T10:30:00Z",
  "status": "active"
}
```

---

### Get My Enrollments
**GET** `/api/v1/academics/enrollments/me/`

Lists the authenticated student's enrollments.

**Authentication Required:** Yes (Student)

**Example Response:** `200 OK`
```json
{
  "count": 5,
  "results": [
    {
      "id": "d50e8400-e29b-41d4-a716-446655440000",
      "student": "550e8400-e29b-41d4-a716-446655440000",
      "student_name": "John Doe",
      "course_offering": "c50e8400-e29b-41d4-a716-446655440000",
      "course_name": "Data Structures and Algorithms",
      "enrolled_at": "2026-01-15T10:00:00Z",
      "status": "active"
    }
  ]
}
```

---

### Delete Enrollment (Drop Course)
**DELETE** `/api/v1/academics/enrollments/{enrollment_id}/`

Drops a course enrollment.

**Authentication Required:** Yes

**Example Response:** `204 No Content`

---

## Assignments

### List Assignments
**GET** `/api/v1/assignments/`

Lists all assignments. Students see only published assignments.

**Authentication Required:** Yes

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| course_offering | UUID | Filter by course offering ID |
| assignment_type | string | Filter by: `assignment`, `quiz`, `exam`, `project` |
| is_published | boolean | Filter by published status |
| search | string | Search by title |

**Example Response:** `200 OK`
```json
{
  "count": 20,
  "results": [
    {
      "id": "e50e8400-e29b-41d4-a716-446655440000",
      "title": "Assignment 1: Binary Trees",
      "description": "Implement various binary tree operations.",
      "course_offering": "c50e8400-e29b-41d4-a716-446655440000",
      "course_name": "Data Structures and Algorithms",
      "created_by": "760e8400-e29b-41d4-a716-446655440000",
      "created_by_name": "Dr. Jane Smith",
      "due_date": "2026-03-15T23:59:00Z",
      "max_marks": 100.00,
      "assignment_type": "assignment",
      "attachments": [
        {"filename": "assignment1.pdf", "url": "/media/assignments/assignment1.pdf"}
      ],
      "is_published": true,
      "submission_count": 35,
      "created_at": "2026-03-01T10:00:00Z",
      "updated_at": "2026-03-01T10:00:00Z"
    }
  ]
}
```

---

### Create Assignment
**POST** `/api/v1/assignments/`

Creates a new assignment (Faculty only).

**Authentication Required:** Yes (Faculty)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Assignment title |
| description | string | No | Assignment description |
| course_offering | UUID | Yes | Course offering ID |
| due_date | datetime | Yes | Due date (ISO 8601 format) |
| max_marks | decimal | Yes | Maximum marks |
| assignment_type | string | Yes | One of: `assignment`, `quiz`, `exam`, `project` |
| attachments | JSON | No | Array of attachment objects |
| is_published | boolean | No | Published status (default: false) |

**Example Request:**
```json
{
  "title": "Assignment 1: Binary Trees",
  "description": "Implement various binary tree operations.",
  "course_offering": "c50e8400-e29b-41d4-a716-446655440000",
  "due_date": "2026-03-15T23:59:00Z",
  "max_marks": 100.00,
  "assignment_type": "assignment",
  "is_published": true
}
```

---

### Get Assignment
**GET** `/api/v1/assignments/{assignment_id}/`

Retrieves an assignment by ID.

**Authentication Required:** Yes

---

### Update Assignment
**PATCH** `/api/v1/assignments/{assignment_id}/`

Updates an assignment (Owner or Admin).

**Authentication Required:** Yes (Owner or Admin)

---

### Delete Assignment
**DELETE** `/api/v1/assignments/{assignment_id}/`

Deletes an assignment (Owner or Admin).

**Authentication Required:** Yes (Owner or Admin)

---

### Submit Assignment
**POST** `/api/v1/assignments/{assignment_id}/submit/`

Submits work for an assignment.

**Authentication Required:** Yes (Student)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | file | No | Uploaded file |
| text_content | string | No | Text submission |

**Example Request (multipart/form-data):**
```
file: assignment1_john_doe.pdf
text_content: "My solution involves..."
```

**Example Response:** `201 Created`
```json
{
  "id": "f50e8400-e29b-41d4-a716-446655440000",
  "assignment": "e50e8400-e29b-41d4-a716-446655440000",
  "student": "550e8400-e29b-41d4-a716-446655440000",
  "student_name": "John Doe",
  "file": "/media/submissions/2026/03/assignment1_john_doe.pdf",
  "text_content": "My solution involves...",
  "submitted_at": "2026-03-02T15:30:00Z",
  "marks_obtained": null,
  "grade": null,
  "feedback": null,
  "graded_by": null,
  "graded_at": null,
  "status": "submitted"
}
```

---

### List Assignment Submissions
**GET** `/api/v1/assignments/{assignment_id}/submissions/`

Lists all submissions for an assignment (Faculty or Admin).

**Authentication Required:** Yes (Faculty or Admin)

**Example Response:** `200 OK`
```json
{
  "count": 35,
  "results": [
    {
      "id": "f50e8400-e29b-41d4-a716-446655440000",
      "assignment": "e50e8400-e29b-41d4-a716-446655440000",
      "student": "550e8400-e29b-41d4-a716-446655440000",
      "student_name": "John Doe",
      "file": "/media/submissions/2026/03/assignment1_john_doe.pdf",
      "text_content": null,
      "submitted_at": "2026-03-02T15:30:00Z",
      "marks_obtained": 85.00,
      "grade": "A",
      "feedback": "Excellent work!",
      "graded_by": "760e8400-e29b-41d4-a716-446655440000",
      "graded_at": "2026-03-05T10:00:00Z",
      "status": "graded"
    }
  ]
}
```

---

### Get My Submission
**GET** `/api/v1/assignments/{assignment_id}/submissions/me/`

Retrieves the authenticated student's submission for an assignment.

**Authentication Required:** Yes (Student)

**Example Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "id": "f50e8400-e29b-41d4-a716-446655440000",
    "assignment": "e50e8400-e29b-41d4-a716-446655440000",
    "student": "550e8400-e29b-41d4-a716-446655440000",
    "student_name": "John Doe",
    "file": "/media/submissions/2026/03/assignment1_john_doe.pdf",
    "submitted_at": "2026-03-02T15:30:00Z",
    "marks_obtained": 85.00,
    "grade": "A",
    "feedback": "Excellent work!",
    "status": "graded"
  }
}
```

---

### Grade Submission
**POST** `/api/v1/assignments/{assignment_id}/submissions/{submission_id}/grade/`

Grades a student's submission (Faculty or Admin).

**Authentication Required:** Yes (Faculty or Admin)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| marks_obtained | decimal | Yes | Marks awarded |
| grade | string | No | Letter grade (e.g., "A", "B+") |
| feedback | string | No | Feedback text |

**Example Request:**
```json
{
  "marks_obtained": 85.00,
  "grade": "A",
  "feedback": "Excellent work! Your implementation is efficient and well-documented."
}
```

**Example Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Submission graded successfully."
}
```

---

### Export Grades
**GET** `/api/v1/assignments/export/{offering_id}/`

Exports all grades for a course offering as CSV (Faculty or Admin).

**Authentication Required:** Yes (Faculty or Admin)

**Example Response:** `200 OK` (CSV file download)

---

## Content Management

### List Folders
**GET** `/api/v1/content/folders/`

Lists all content folders.

**Authentication Required:** Yes

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| course_offering | UUID | Filter by course offering ID |
| parent | UUID | Filter by parent folder ID |
| visibility | string | Filter by: `public`, `department`, `course`, `private` |

**Example Response:** `200 OK`
```json
{
  "count": 10,
  "results": [
    {
      "id": "g50e8400-e29b-41d4-a716-446655440000",
      "name": "Lecture Notes",
      "parent": null,
      "created_by": "760e8400-e29b-41d4-a716-446655440000",
      "created_by_name": "Dr. Jane Smith",
      "course_offering": "c50e8400-e29b-41d4-a716-446655440000",
      "visibility": "course",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

### Create Folder
**POST** `/api/v1/content/folders/`

Creates a new content folder (Faculty or Admin).

**Authentication Required:** Yes (Faculty or Admin)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Folder name |
| parent | UUID | No | Parent folder ID |
| course_offering | UUID | No | Course offering ID |
| visibility | string | No | One of: `public`, `department`, `course`, `private` |

---

### List Content
**GET** `/api/v1/content/`

Lists all content items.

**Authentication Required:** Yes

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| course_offering | UUID | Filter by course offering ID |
| content_type | string | Filter by: `document`, `video`, `image`, `link`, `assignment` |
| folder | UUID | Filter by folder ID |
| visibility | string | Filter by visibility |
| search | string | Search by title or description |

**Example Response:** `200 OK`
```json
{
  "count": 50,
  "results": [
    {
      "id": "h50e8400-e29b-41d4-a716-446655440000",
      "title": "Lecture 1: Introduction to Data Structures",
      "content_type": "document",
      "file_size": 2048576,
      "mime_type": "application/pdf",
      "uploaded_by": "760e8400-e29b-41d4-a716-446655440000",
      "uploaded_by_name": "Dr. Jane Smith",
      "course_offering": "c50e8400-e29b-41d4-a716-446655440000",
      "visibility": "course",
      "is_published": true,
      "tags": [
        {"id": "tag1", "name": "introduction"},
        {"id": "tag2", "name": "data-structures"}
      ],
      "created_at": "2026-01-20T10:00:00Z"
    }
  ]
}
```

---

### Create Content
**POST** `/api/v1/content/`

Uploads new content (Faculty or Admin).

**Authentication Required:** Yes (Faculty or Admin)

**Request Body (multipart/form-data or JSON):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Content title |
| description | string | No | Content description |
| content_type | string | Yes | One of: `document`, `video`, `image`, `link`, `assignment` |
| file | file | No* | File upload |
| external_url | string | No* | External URL (for links/videos) |
| folder | UUID | No | Folder ID |
| course_offering | UUID | No | Course offering ID |
| visibility | string | No | Visibility level (default: `course`) |
| tag_ids | array | No | Array of tag UUIDs |
| publish_at | datetime | No | Schedule publication |
| expires_at | datetime | No | Expiration date |
| is_published | boolean | No | Published status (default: true) |

*Either `file` or `external_url` is required depending on content type.

---

### Get Content
**GET** `/api/v1/content/{content_id}/`

Retrieves content details and logs a view.

**Authentication Required:** Yes

**Example Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "id": "h50e8400-e29b-41d4-a716-446655440000",
    "title": "Lecture 1: Introduction to Data Structures",
    "description": "Overview of fundamental data structures.",
    "content_type": "document",
    "file": "/media/content/2026/01/lecture1.pdf",
    "file_size": 2048576,
    "mime_type": "application/pdf",
    "external_url": null,
    "folder": "g50e8400-e29b-41d4-a716-446655440000",
    "course_offering": "c50e8400-e29b-41d4-a716-446655440000",
    "uploaded_by": "760e8400-e29b-41d4-a716-446655440000",
    "uploaded_by_name": "Dr. Jane Smith",
    "visibility": "course",
    "tags": [
      {"id": "tag1", "name": "introduction"}
    ],
    "publish_at": null,
    "expires_at": null,
    "is_published": true,
    "created_at": "2026-01-20T10:00:00Z",
    "updated_at": "2026-01-20T10:00:00Z"
  }
}
```

---

### Download Content
**GET** `/api/v1/content/{content_id}/download/`

Downloads content and logs the action.

**Authentication Required:** Yes

**Example Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "url": "/media/content/2026/01/lecture1.pdf"
  }
}
```

---

### Get Content Stats
**GET** `/api/v1/content/{content_id}/stats/`

Gets view and download statistics (Owner or Admin).

**Authentication Required:** Yes (Owner or Admin)

**Example Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "total_views": 150,
    "total_downloads": 85,
    "unique_users": 42
  }
}
```

---

### List Recent Content
**GET** `/api/v1/content/recent/`

Lists recently uploaded content.

**Authentication Required:** Yes

**Example Response:** `200 OK`
```json
{
  "status": "success",
  "data": [
    {
      "id": "h50e8400-e29b-41d4-a716-446655440000",
      "title": "Lecture 1: Introduction to Data Structures",
      "content_type": "document",
      "created_at": "2026-01-20T10:00:00Z"
    }
  ]
}
```

---

### List Tags
**GET** `/api/v1/content/tags/`

Lists all content tags.

**Authentication Required:** Yes

**Example Response:** `200 OK`
```json
{
  "count": 20,
  "results": [
    {
      "id": "tag1",
      "name": "introduction"
    },
    {
      "id": "tag2",
      "name": "data-structures"
    }
  ]
}
```

---

### Create Tag
**POST** `/api/v1/content/tags/`

Creates a new content tag.

**Authentication Required:** Yes

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Tag name (unique) |

---

### List Bookmarks
**GET** `/api/v1/content/bookmarks/`

Lists the authenticated user's bookmarks.

**Authentication Required:** Yes

**Example Response:** `200 OK`
```json
{
  "count": 10,
  "results": [
    {
      "id": "i50e8400-e29b-41d4-a716-446655440000",
      "user": "550e8400-e29b-41d4-a716-446655440000",
      "content": "h50e8400-e29b-41d4-a716-446655440000",
      "content_title": "Lecture 1: Introduction to Data Structures",
      "content_type": "document",
      "created_at": "2026-02-01T14:30:00Z"
    }
  ]
}
```

---

### Create Bookmark
**POST** `/api/v1/content/bookmarks/`

Bookmarks a content item.

**Authentication Required:** Yes

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| content | UUID | Yes | Content ID |

---

### Delete Bookmark
**DELETE** `/api/v1/content/bookmarks/{bookmark_id}/`

Removes a bookmark.

**Authentication Required:** Yes

---

## Timetable & Attendance

### List Rooms
**GET** `/api/v1/timetable/rooms/`

Lists all rooms.

**Authentication Required:** Yes

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| room_type | string | Filter by: `classroom`, `lab`, `auditorium`, `conference` |
| is_available | boolean | Filter by availability |

**Example Response:** `200 OK`
```json
{
  "count": 30,
  "results": [
    {
      "id": "j50e8400-e29b-41d4-a716-446655440000",
      "name": "Room 101",
      "building": "Science Block",
      "capacity": 60,
      "room_type": "classroom",
      "is_available": true
    }
  ]
}
```

---

### Create Room
**POST** `/api/v1/timetable/rooms/`

Creates a new room (Admin only).

**Authentication Required:** Yes (Admin only)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Room name |
| building | string | No | Building name |
| capacity | integer | Yes | Room capacity |
| room_type | string | Yes | One of: `classroom`, `lab`, `auditorium`, `conference` |
| is_available | boolean | No | Availability (default: true) |

---

### List Timetable Entries
**GET** `/api/v1/timetable/`

Lists all timetable entries.

**Authentication Required:** Yes

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| semester | UUID | Filter by semester ID |
| day_of_week | integer | Filter by day (0=Monday, 6=Sunday) |
| room | UUID | Filter by room ID |
| faculty | UUID | Filter by faculty user ID |
| department | UUID | Filter by department ID |
| is_active | boolean | Filter by active status |

**Example Response:** `200 OK`
```json
{
  "count": 40,
  "results": [
    {
      "id": "k50e8400-e29b-41d4-a716-446655440000",
      "course_offering": "c50e8400-e29b-41d4-a716-446655440000",
      "course_name": "Data Structures and Algorithms",
      "course_code": "CS201",
      "faculty_name": "Dr. Jane Smith",
      "room": "j50e8400-e29b-41d4-a716-446655440000",
      "room_name": "Room 101",
      "day_of_week": 0,
      "day_name": "Monday",
      "start_time": "09:00:00",
      "end_time": "10:30:00",
      "semester": "a50e8400-e29b-41d4-a716-446655440000",
      "is_active": true
    }
  ]
}
```

---

### Create Timetable Entry
**POST** `/api/v1/timetable/`

Creates a new timetable entry (Admin only).

**Authentication Required:** Yes (Admin only)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| course_offering | UUID | Yes | Course offering ID |
| room | UUID | Yes | Room ID |
| day_of_week | integer | Yes | Day (0=Monday, 6=Sunday) |
| start_time | time | Yes | Start time (HH:MM:SS) |
| end_time | time | Yes | End time (HH:MM:SS) |
| semester | UUID | Yes | Semester ID |
| is_active | boolean | No | Active status (default: true) |

---

### Get My Timetable
**GET** `/api/v1/timetable/me/`

Gets the authenticated user's timetable (student or faculty).

**Authentication Required:** Yes

**Example Response:** `200 OK`
```json
{
  "count": 15,
  "results": [
    {
      "id": "k50e8400-e29b-41d4-a716-446655440000",
      "course_offering": "c50e8400-e29b-41d4-a716-446655440000",
      "course_name": "Data Structures and Algorithms",
      "course_code": "CS201",
      "faculty_name": "Dr. Jane Smith",
      "room": "j50e8400-e29b-41d4-a716-446655440000",
      "room_name": "Room 101",
      "day_of_week": 0,
      "day_name": "Monday",
      "start_time": "09:00:00",
      "end_time": "10:30:00",
      "semester": "a50e8400-e29b-41d4-a716-446655440000",
      "is_active": true
    }
  ]
}
```

---

### Check Timetable Conflicts
**GET** `/api/v1/timetable/conflicts/`

Checks for scheduling conflicts.

**Authentication Required:** Yes (Admin)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| semester | UUID | Semester ID |

**Example Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "conflicts": [
      {
        "type": "room_conflict",
        "room": "Room 101",
        "time": "Monday 09:00-10:30",
        "entries": [
          "CS201 Section A",
          "CS202 Section B"
        ]
      }
    ]
  }
}
```

---

### Mark Bulk Attendance
**POST** `/api/v1/attendance/mark/`

Marks attendance for multiple students (Faculty or Admin).

**Authentication Required:** Yes (Faculty or Admin)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| timetable_entry_id | UUID | Yes | Timetable entry ID |
| date | date | Yes | Attendance date (YYYY-MM-DD) |
| records | array | Yes | Array of attendance records |

**Record Object:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| student_id | UUID | Yes | Student user ID |
| status | string | Yes | One of: `present`, `absent`, `late`, `excused` |

**Example Request:**
```json
{
  "timetable_entry_id": "k50e8400-e29b-41d4-a716-446655440000",
  "date": "2026-03-02",
  "records": [
    {
      "student_id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "present"
    },
    {
      "student_id": "660e8400-e29b-41d4-a716-446655440000",
      "status": "absent"
    }
  ]
}
```

**Example Response:** `201 Created`
```json
{
  "status": "success",
  "message": "Attendance marked for 2 students."
}
```

---

### Get My Attendance
**GET** `/api/v1/attendance/me/`

Gets the authenticated student's attendance records.

**Authentication Required:** Yes (Student)

**Example Response:** `200 OK`
```json
{
  "count": 50,
  "results": [
    {
      "id": "l50e8400-e29b-41d4-a716-446655440000",
      "timetable_entry": "k50e8400-e29b-41d4-a716-446655440000",
      "student": "550e8400-e29b-41d4-a716-446655440000",
      "student_name": "John Doe",
      "date": "2026-03-02",
      "status": "present",
      "marked_by": "760e8400-e29b-41d4-a716-446655440000",
      "remarks": null,
      "created_at": "2026-03-02T10:00:00Z"
    }
  ]
}
```

---

### Get My Course Attendance
**GET** `/api/v1/attendance/me/{offering_id}/`

Gets the authenticated student's attendance for a specific course.

**Authentication Required:** Yes (Student)

**Example Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "course": "Data Structures and Algorithms",
    "total_classes": 30,
    "attended": 28,
    "percentage": 93.33,
    "records": [
      {
        "date": "2026-03-02",
        "status": "present"
      }
    ]
  }
}
```

---

### Get Course Attendance
**GET** `/api/v1/attendance/course/{offering_id}/`

Gets attendance records for all students in a course (Faculty or Admin).

**Authentication Required:** Yes (Faculty or Admin)

**Example Response:** `200 OK`
```json
{
  "status": "success",
  "data": [
    {
      "student_id": "550e8400-e29b-41d4-a716-446655440000",
      "student_name": "John Doe",
      "total_classes": 30,
      "attended": 28,
      "percentage": 93.33
    }
  ]
}
```

---

### Update Attendance Record
**PATCH** `/api/v1/attendance/{attendance_id}/`

Updates an attendance record (Faculty or Admin).

**Authentication Required:** Yes (Faculty or Admin)

**Request Body (all fields optional):**
| Field | Type | Description |
|-------|------|-------------|
| status | string | One of: `present`, `absent`, `late`, `excused` |
| remarks | string | Additional remarks |

---

## Communications

### List Announcements
**GET** `/api/v1/communications/announcements/`

Lists all announcements.

**Authentication Required:** Yes

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| target_type | string | Filter by: `all`, `department`, `course`, `section` |
| is_urgent | boolean | Filter by urgent status |
| is_published | boolean | Filter by published status |
| search | string | Search by title or body |

**Example Response:** `200 OK`
```json
{
  "count": 25,
  "results": [
    {
      "id": "m50e8400-e29b-41d4-a716-446655440000",
      "title": "Midterm Exams Schedule",
      "body": "The midterm exams will be held from March 15-20, 2026.",
      "created_by": "760e8400-e29b-41d4-a716-446655440000",
      "created_by_name": "Dr. Jane Smith",
      "target_type": "department",
      "target_id": "650e8400-e29b-41d4-a716-446655440000",
      "is_urgent": true,
      "publish_at": null,
      "expires_at": "2026-03-20T23:59:00Z",
      "is_published": true,
      "created_at": "2026-03-01T10:00:00Z"
    }
  ]
}
```

---

### Create Announcement
**POST** `/api/v1/communications/announcements/`

Creates a new announcement (Faculty or Admin).

**Authentication Required:** Yes (Faculty or Admin)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Announcement title |
| body | string | Yes | Announcement content |
| target_type | string | Yes | One of: `all`, `department`, `course`, `section` |
| target_id | UUID | No | Target entity ID (required if not `all`) |
| is_urgent | boolean | No | Urgent flag (default: false) |
| publish_at | datetime | No | Schedule publication |
| expires_at | datetime | No | Expiration date |
| is_published | boolean | No | Published status (default: true) |

**Example Request:**
```json
{
  "title": "Midterm Exams Schedule",
  "body": "The midterm exams will be held from March 15-20, 2026.",
  "target_type": "department",
  "target_id": "650e8400-e29b-41d4-a716-446655440000",
  "is_urgent": true,
  "expires_at": "2026-03-20T23:59:00Z",
  "is_published": true
}
```

---

### List Messages
**GET** `/api/v1/communications/messages/`

Lists all messages sent or received by the authenticated user.

**Authentication Required:** Yes

**Example Response:** `200 OK`
```json
{
  "count": 15,
  "results": [
    {
      "id": "n50e8400-e29b-41d4-a716-446655440000",
      "sender": "760e8400-e29b-41d4-a716-446655440000",
      "sender_name": "Dr. Jane Smith",
      "receiver": "550e8400-e29b-41d4-a716-446655440000",
      "receiver_name": "John Doe",
      "subject": "Assignment 1 Clarification",
      "body": "Hi John, regarding your question about...",
      "is_read": true,
      "read_at": "2026-03-02T14:00:00Z",
      "created_at": "2026-03-02T13:30:00Z"
    }
  ]
}
```

---

### Send Message
**POST** `/api/v1/communications/messages/`

Sends a new message.

**Authentication Required:** Yes

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| receiver | UUID | Yes | Receiver user ID |
| subject | string | No | Message subject |
| body | string | Yes | Message content |

**Example Request:**
```json
{
  "receiver": "760e8400-e29b-41d4-a716-446655440000",
  "subject": "Assignment 1 Question",
  "body": "Dear Dr. Smith, I have a question about..."
}
```

---

### Get Message
**GET** `/api/v1/communications/messages/{message_id}/`

Gets a message by ID. Marks as read if receiver.

**Authentication Required:** Yes

---

### Delete Message
**DELETE** `/api/v1/communications/messages/{message_id}/`

Deletes a message.

**Authentication Required:** Yes

---

### List Discussion Forums
**GET** `/api/v1/communications/forums/`

Lists all discussion forums.

**Authentication Required:** Yes

**Example Response:** `200 OK`
```json
{
  "count": 10,
  "results": [
    {
      "id": "o50e8400-e29b-41d4-a716-446655440000",
      "title": "General Discussion - Data Structures",
      "course_offering": "c50e8400-e29b-41d4-a716-446655440000",
      "created_by": "760e8400-e29b-41d4-a716-446655440000",
      "created_by_name": "Dr. Jane Smith",
      "is_active": true,
      "post_count": 45,
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

### Create Discussion Forum
**POST** `/api/v1/communications/forums/`

Creates a new discussion forum (Faculty or Admin).

**Authentication Required:** Yes (Faculty or Admin)

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Forum title |
| course_offering | UUID | Yes | Course offering ID |
| is_active | boolean | No | Active status (default: true) |

---

### Create Forum Post
**POST** `/api/v1/communications/forums/{forum_id}/posts/`

Creates a new post in a forum.

**Authentication Required:** Yes

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| body | string | Yes | Post content |
| parent | UUID | No | Parent post ID (for replies) |

**Example Request:**
```json
{
  "body": "I have a question about binary search trees...",
  "parent": null
}
```

---

### List Notifications
**GET** `/api/v1/notifications/`

Lists all notifications for the authenticated user.

**Authentication Required:** Yes

**Example Response:** `200 OK`
```json
{
  "count": 20,
  "results": [
    {
      "id": "p50e8400-e29b-41d4-a716-446655440000",
      "user": "550e8400-e29b-41d4-a716-446655440000",
      "title": "New Assignment Posted",
      "message": "Dr. Jane Smith posted a new assignment: Assignment 1",
      "notification_type": "assignment",
      "reference_type": "Assignment",
      "reference_id": "e50e8400-e29b-41d4-a716-446655440000",
      "channel": "in_app",
      "is_read": false,
      "read_at": null,
      "status": "delivered",
      "created_at": "2026-03-02T10:00:00Z"
    }
  ]
}
```

---

### Get Unread Count
**GET** `/api/v1/notifications/unread-count/`

Gets the count of unread notifications.

**Authentication Required:** Yes

**Example Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "unread_count": 5
  }
}
```

---

### Mark Notification as Read
**POST** `/api/v1/notifications/{notification_id}/read/`

Marks a notification as read.

**Authentication Required:** Yes

**Example Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Notification marked as read."
}
```

---

### Mark All Notifications as Read
**POST** `/api/v1/notifications/read-all/`

Marks all notifications as read.

**Authentication Required:** Yes

**Example Response:** `200 OK`
```json
{
  "status": "success",
  "message": "All notifications marked as read."
}
```

---

### Get Notification Preferences
**GET** `/api/v1/notifications/preferences/`

Gets the authenticated user's notification preferences.

**Authentication Required:** Yes

**Example Response:** `200 OK`
```json
{
  "count": 6,
  "results": [
    {
      "id": "q50e8400-e29b-41d4-a716-446655440000",
      "user": "550e8400-e29b-41d4-a716-446655440000",
      "notification_type": "assignment",
      "email_enabled": true,
      "push_enabled": true,
      "in_app_enabled": true
    }
  ]
}
```

---

### Update Notification Preference
**PATCH** `/api/v1/notifications/preferences/{preference_id}/`

Updates a notification preference.

**Authentication Required:** Yes

**Request Body (all fields optional):**
| Field | Type | Description |
|-------|------|-------------|
| email_enabled | boolean | Enable email notifications |
| push_enabled | boolean | Enable push notifications |
| in_app_enabled | boolean | Enable in-app notifications |

---

## Common Response Formats

### Success Response
```json
{
  "status": "success",
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error description",
  "errors": {
    "field_name": ["Error message 1", "Error message 2"]
  }
}
```

### Paginated Response
```json
{
  "count": 100,
  "next": "/api/v1/endpoint/?page=2",
  "previous": null,
  "results": [ ... ]
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created successfully |
| 204 | No Content - Request succeeded, no content returned |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error - Server error |

---

## Authentication Headers

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

---

## Rate Limiting

The API implements rate limiting:
- **Authenticated users:** 1000 requests/hour
- **Anonymous users:** 100 requests/hour

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1709380800
```

---

## Filtering & Pagination

### Filtering
Use query parameters to filter results:
```
GET /api/v1/users/?role=student&is_active=true
```

### Searching
Use the `search` parameter:
```
GET /api/v1/users/?search=john
```

### Ordering
Use the `ordering` parameter:
```
GET /api/v1/users/?ordering=-created_at
```
Use `-` prefix for descending order.

### Pagination
Default page size is 20. Navigate using `next` and `previous` URLs in responses.

---

## API Schema & Documentation

- **OpenAPI Schema:** `/api/schema/`
- **Swagger UI:** `/api/docs/`
- **ReDoc:** `/api/redoc/`

---

**Last Updated:** March 2, 2026  
**API Version:** 1.0
