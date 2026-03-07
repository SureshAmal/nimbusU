# NimbusU Backend

NimbusU backend is a Django + Django REST Framework service for the university content management platform. It powers authentication, academics, content, assignments, timetable, communications, telemetry, daily questions, and student/faculty/admin workflows.

## Stack

- Python 3.12+
- Django 6
- Django REST Framework
- Simple JWT authentication
- PostgreSQL
- MinIO / S3-compatible media storage
- Channels + Daphne for realtime support
- drf-spectacular for OpenAPI docs
- `uv` for dependency and command management

## Apps

The backend is split into domain apps under [apps](apps):

- `accounts` — users, profiles, auth, preferences, audit logs, seed command
- `academics` — schools, departments, programs, semesters, courses, offerings, enrollments, grades, daily questions
- `content` — files, folders, tags, bookmarks, comments, versions, access logs
- `assignments` — assignments, submissions, grading groups, rubrics
- `timetable` — timetable entries, rooms, attendance, swaps, cancellations, bookings
- `communications` — announcements, messages, discussions, notifications, webhooks
- `telemetry` — request logging and site settings

## Prerequisites

Before running the backend, make sure these are available:

- Python 3.12 or newer
- `uv`
- PostgreSQL running locally or remotely
- Docker Compose if you want to start MinIO from the repo's [docker-compose.yml](../docker-compose.yml)

## Quick Start

### 1. Install dependencies

From [NimbusU-backend](.):

```bash
uv sync
```

### 2. Create environment variables

Create a `.env` file inside [NimbusU-backend](.) with values like:

```env
SECRET_KEY=change-me
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=nimbusu_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

CORS_ALLOWED_ORIGINS=http://localhost:3000

JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=nimbusu-media
```

### 3. Start MinIO

From the repository root [docker-compose.yml](../docker-compose.yml):

```bash
docker compose up -d minio minio-init
```

This creates the default `nimbusu-media` bucket used for uploaded files.

### 4. Run migrations

```bash
uv run python manage.py migrate
```

### 5. Seed demo data (optional but recommended)

```bash
uv run python manage.py seed_all --reset
```

The seed command creates a rich demo dataset including:

- admin, faculty, and student users
- schools, departments, programs, semesters, courses, and offerings
- enrollments, grades, and student tasks
- daily questions, assignments, responses, and performance data
- assignments, rubrics, forums, announcements, notifications
- content, bookmarks, comments, access logs
- timetable entries, attendance, room bookings, substitute faculty
- telemetry and site settings

### 6. Start the development server

```bash
uv run python manage.py runserver 0.0.0.0:8000
```

Backend base URL:

- API root: http://localhost:8000/api/v1/
- Admin: http://localhost:8000/admin/
- Swagger: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/
- Schema: http://localhost:8000/api/schema/

## Seeded Demo Credentials

When using `seed_all`, these credentials are available:

- Admin: `admin@nimbusu.edu` / `Admin@1234`
- Faculty accounts: password `Faculty@1234`
- Student accounts: password `Student@1234`

Faculty and student emails are generated in the seed file at [apps/accounts/management/commands/seed_all.py](apps/accounts/management/commands/seed_all.py).

## Useful Commands

```bash
uv run python manage.py migrate
uv run python manage.py makemigrations
uv run python manage.py createsuperuser
uv run python manage.py seed_all
uv run python manage.py seed_all --reset
uv run python manage.py runserver
```

## API Notes

- Authentication uses JWT bearer tokens.
- Default API base path is `/api/v1/`.
- Most endpoints require authentication.
- OpenAPI documentation is generated with drf-spectacular.
- CORS is configured through `CORS_ALLOWED_ORIGINS`.

## Storage Notes

- Uploaded media is stored using MinIO/S3 through `django-storages`.
- Static files use Django's default static storage.
- `MEDIA_URL` is generated from the MinIO endpoint and bucket.

## Realtime Notes

- ASGI is enabled via Daphne and Channels.
- The current development configuration uses an in-memory channel layer.
- This is suitable for local development, but production should use a shared backend such as Redis.

## Project Layout

```text
NimbusU-backend/
├── manage.py
├── pyproject.toml
├── uv.lock
├── nimbusu/
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
└── apps/
	├── accounts/
	├── academics/
	├── assignments/
	├── communications/
	├── content/
	├── telemetry/
	└── timetable/
```

## Frontend Integration

The frontend expects this backend to be reachable at:

- `http://localhost:8000/api/v1` by default
- or the URL configured through `NEXT_PUBLIC_API_URL` in the frontend

If the frontend runs on `http://localhost:3000`, keep `CORS_ALLOWED_ORIGINS` aligned with that origin.

## Current Focus Areas

The codebase already includes support for:

- role-based dashboards for admin, faculty, and student users
- daily question workflows with assignment, submission, status sync, and performance analytics
- student/faculty course views
- content and communication modules
- customizable frontend theme integration via the API-backed app flows

## Troubleshooting

### Database connection errors

Check that PostgreSQL is running and your `.env` database values match the target instance.

### Uploaded files not loading

Check that MinIO is running and the `nimbusu-media` bucket exists.

### Frontend login succeeds but data calls fail

Check:

- backend is running on port `8000`
- frontend `NEXT_PUBLIC_API_URL` points to `/api/v1`
- CORS includes the frontend origin

### Schema or docs page missing

Verify [nimbusu/urls.py](nimbusu/urls.py) is loaded and the server started successfully.
