"""
Comprehensive seed command — populates the entire NimbusU database.

Usage:
    uv run python manage.py seed_all
    uv run python manage.py seed_all --reset   # flush & recreate
"""

import random
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.academics.models import (
    Course,
    CourseOffering,
    Department,
    Enrollment,
    Program,
    School,
    Semester,
)
from apps.accounts.models import AuditLog, FacultyProfile, StudentProfile
from apps.assignments.models import Assignment, Submission
from apps.communications.models import (
    Announcement,
    DiscussionForum,
    DiscussionPost,
    Message,
    Notification,
)
from apps.content.models import Bookmark, Content, ContentFolder, ContentTag
from apps.timetable.models import AttendanceRecord, Room, TimetableEntry

User = get_user_model()

# ── Data constants ───────────────────────────────────────────────────

SCHOOLS = [
    ("SOET", "School of Engineering & Technology"),
    ("SOS", "School of Sciences"),
    ("SOC", "School of Commerce & Management"),
]

# (code, name, school_code)
DEPARTMENTS = [
    ("CS", "Computer Science", "SOET"),
    ("EC", "Electronics & Communication", "SOET"),
    ("ME", "Mechanical Engineering", "SOET"),
    ("CE", "Civil Engineering", "SOET"),
    ("MA", "Mathematics", "SOS"),
]

PROGRAMS = [
    ("BTECHCS", "B.Tech Computer Science", "CS", 4, "UG"),
    ("BTECHEC", "B.Tech Electronics", "EC", 4, "UG"),
    ("BTECHME", "B.Tech Mechanical", "ME", 4, "UG"),
    ("MTECHCS", "M.Tech Computer Science", "CS", 2, "PG"),
    ("MTECHEC", "M.Tech Electronics", "EC", 2, "PG"),
]

COURSES = [
    ("CS101", "Introduction to Programming", "CS", 4, "Basics of programming in C and Python."),
    ("CS201", "Data Structures & Algorithms", "CS", 4, "Arrays, linked lists, trees, graphs, sorting."),
    ("CS301", "Database Management Systems", "CS", 3, "Relational databases, SQL, normalization."),
    ("CS401", "Machine Learning", "CS", 4, "Supervised and unsupervised learning, neural networks."),
    ("CS302", "Operating Systems", "CS", 3, "Process management, memory, file systems."),
    ("CS402", "Computer Networks", "CS", 3, "TCP/IP, routing, application layer protocols."),
    ("EC201", "Digital Electronics", "EC", 4, "Combinational and sequential circuits."),
    ("EC301", "Signal Processing", "EC", 3, "Fourier transforms, filters, sampling."),
    ("ME201", "Thermodynamics", "ME", 4, "Laws of thermodynamics, heat engines."),
    ("MA101", "Engineering Mathematics I", "MA", 4, "Calculus, linear algebra, differential equations."),
]

FACULTY_DATA = [
    ("priya.sharma@nimbusu.edu", "Dr. Priya", "Sharma", "CS", "Professor", "AI & Machine Learning"),
    ("rajesh.kumar@nimbusu.edu", "Dr. Rajesh", "Kumar", "CS", "Associate Professor", "Databases"),
    ("anita.desai@nimbusu.edu", "Dr. Anita", "Desai", "EC", "Professor", "VLSI Design"),
    ("suresh.nair@nimbusu.edu", "Dr. Suresh", "Nair", "ME", "Assistant Professor", "Fluid Mechanics"),
    ("meena.iyer@nimbusu.edu", "Dr. Meena", "Iyer", "MA", "Professor", "Applied Mathematics"),
    ("arjun.reddy@nimbusu.edu", "Dr. Arjun", "Reddy", "CS", "Assistant Professor", "Computer Networks"),
    ("kavitha.bose@nimbusu.edu", "Dr. Kavitha", "Bose", "EC", "Professor", "Signal Processing"),
]

# (email, first, last, dept, program, semester, batch_year, batch, division, register_no)
STUDENT_DATA = [
    ("aarav.patel@nimbusu.edu", "Aarav", "Patel", "CS", "BTECHCS", 4, 2023, "A1", "A", "REG2023CS001"),
    ("diya.sharma@nimbusu.edu", "Diya", "Sharma", "CS", "BTECHCS", 4, 2023, "A1", "A", "REG2023CS002"),
    ("rohan.verma@nimbusu.edu", "Rohan", "Verma", "CS", "BTECHCS", 6, 2022, "A1", "A", "REG2022CS001"),
    ("ananya.singh@nimbusu.edu", "Ananya", "Singh", "CS", "BTECHCS", 6, 2022, "A2", "A", "REG2022CS002"),
    ("kiran.joshi@nimbusu.edu", "Kiran", "Joshi", "CS", "MTECHCS", 2, 2025, "B1", "B", "REG2025CS001"),
    ("sneha.gupta@nimbusu.edu", "Sneha", "Gupta", "EC", "BTECHEC", 4, 2023, "A1", "A", "REG2023EC001"),
    ("arjun.menon@nimbusu.edu", "Arjun", "Menon", "EC", "BTECHEC", 6, 2022, "A1", "A", "REG2022EC001"),
    ("priti.das@nimbusu.edu", "Priti", "Das", "ME", "BTECHME", 4, 2023, "A1", "A", "REG2023ME001"),
    ("vikram.lal@nimbusu.edu", "Vikram", "Lal", "CS", "BTECHCS", 2, 2024, "A1", "A", "REG2024CS001"),
    ("neha.kapoor@nimbusu.edu", "Neha", "Kapoor", "CS", "BTECHCS", 2, 2024, "A2", "A", "REG2024CS002"),
    ("amit.thakur@nimbusu.edu", "Amit", "Thakur", "EC", "BTECHEC", 2, 2024, "A1", "A", "REG2024EC001"),
    ("pooja.rao@nimbusu.edu", "Pooja", "Rao", "CS", "BTECHCS", 4, 2023, "A2", "B", "REG2023CS003"),
    ("rahul.saxena@nimbusu.edu", "Rahul", "Saxena", "CS", "MTECHCS", 2, 2025, "B1", "B", "REG2025CS002"),
    ("deepika.nair@nimbusu.edu", "Deepika", "Nair", "ME", "BTECHME", 6, 2022, "A1", "A", "REG2022ME001"),
    ("siddharth.jain@nimbusu.edu", "Siddharth", "Jain", "CS", "BTECHCS", 6, 2022, "A1", "B", "REG2022CS003"),
]

ROOMS = [
    ("Room 101", "Main Block", 60, "classroom"),
    ("Room 102", "Main Block", 60, "classroom"),
    ("Room 201", "Main Block", 120, "classroom"),
    ("CS Lab 1", "IT Block", 40, "lab"),
    ("CS Lab 2", "IT Block", 40, "lab"),
    ("EC Lab 1", "Electronics Block", 30, "lab"),
    ("Physics Lab", "Science Block", 35, "lab"),
    ("Seminar Hall", "Admin Block", 200, "auditorium"),
    ("Conference Room A", "Admin Block", 20, "conference"),
]

ANNOUNCEMENTS = [
    ("Mid-Semester Examination Schedule", "Mid-semester exams will be held from March 15-22, 2026. Detailed timetable is published on the portal.", False, "all"),
    ("Library Extended Hours During Exams", "Library will remain open until 11 PM during the examination period.", False, "all"),
    ("Annual Tech Fest — Technovista 2026", "Register for Technovista 2026 before March 5! Events include hackathon, paper presentation, and robotics.", True, "all"),
    ("Campus Maintenance — Water Supply Disruption", "Water supply will be disrupted on March 8 from 6 AM to 12 PM for maintenance work.", True, "all"),
    ("Scholarship Application Deadline", "Last date for merit scholarship applications is March 10, 2026.", False, "all"),
    ("Workshop on Cloud Computing", "AWS Cloud workshop on March 12 at Seminar Hall. Registration open for CS and EC students.", False, "department"),
    ("Sports Day Registration Open", "Annual Sports Day on March 25. Register with PE department by March 15.", False, "all"),
    ("Guest Lecture: AI in Healthcare", "Dr. Rajan Mehta from AIIMS will deliver a guest lecture on March 18 in Seminar Hall.", False, "department"),
]

CONTENT_ITEMS = [
    ("Introduction to Python — Lecture Notes", "document", "Comprehensive notes covering Python basics, data types, control structures."),
    ("Data Structures — Trees & Graphs Video", "video", "Recorded lecture on tree traversal and graph algorithms."),
    ("DBMS ER Diagram Reference", "image", "Entity-relationship diagram for the university management system project."),
    ("Machine Learning — Andrew Ng Course", "link", "Link to Stanford's free ML course on Coursera."),
    ("Operating Systems — Process Scheduling PDF", "document", "Notes on FCFS, SJF, Round Robin, and Priority scheduling."),
    ("Digital Electronics Lab Manual", "document", "Lab experiments for combinational and sequential circuits."),
    ("Signal Processing MATLAB Examples", "document", "MATLAB scripts for Fourier transforms and filter design."),
    ("Engineering Math Formulae Cheat Sheet", "document", "Quick reference for calculus and linear algebra formulas."),
    ("Computer Networks — TCP/IP Explained", "video", "Animated explanation of the TCP/IP protocol stack."),
    ("Database Normalization Tutorial", "link", "Interactive tutorial on 1NF, 2NF, 3NF, and BCNF."),
]

TAGS = ["python", "algorithms", "database", "machine-learning", "networking", "mathematics", "electronics", "lab", "exam-prep", "notes"]


class Command(BaseCommand):
    help = "Seed the entire NimbusU database with realistic test data"

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete ALL data and recreate")

    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write(self.style.WARNING("Flushing all seed data..."))
            self._flush()

        self.stdout.write(self.style.HTTP_INFO("\n🌱 Seeding NimbusU database...\n"))

        schools = self._seed_schools()
        depts = self._seed_departments(schools)
        programs = self._seed_programs(depts)
        semester = self._seed_semesters()
        courses = self._seed_courses(depts)
        admin = self._seed_admin(depts)
        faculty_users = self._seed_faculty(depts)
        student_users = self._seed_students(depts, programs)
        offerings = self._seed_offerings(courses, semester, faculty_users)
        self._seed_enrollments(student_users, offerings)
        rooms = self._seed_rooms()
        self._seed_timetable(offerings, semester)
        self._seed_assignments(offerings, faculty_users, student_users)
        self._seed_announcements(admin, faculty_users)
        self._seed_content(offerings, faculty_users)
        self._seed_messages(faculty_users, student_users)
        self._seed_notifications(student_users)
        self._seed_audit_logs(admin, faculty_users)

        self.stdout.write(self.style.SUCCESS("\n" + "=" * 55))
        self.stdout.write(self.style.SUCCESS("✅ Seed complete! Login credentials:"))
        self.stdout.write(self.style.SUCCESS("=" * 55))
        self.stdout.write(f"  {'admin':10s} → admin@nimbusu.edu / Admin@1234")
        for fd in FACULTY_DATA:
            self.stdout.write(f"  {'faculty':10s} → {fd[0]} / Faculty@1234")
        for sd in STUDENT_DATA[:3]:
            self.stdout.write(f"  {'student':10s} → {sd[0]} / Student@1234")
        self.stdout.write(f"  ... and {len(STUDENT_DATA)-3} more students (password: Student@1234)")
        self.stdout.write("")

    def _flush(self):
        """Remove all seeded data in reverse-dependency order."""
        models = [
            AttendanceRecord, TimetableEntry, Room,
            Bookmark, Content, ContentTag, ContentFolder,
            Notification, DiscussionPost, DiscussionForum, Message, Announcement,
            Submission, Assignment,
            Enrollment, CourseOffering, Course, Semester, Program,
            AuditLog, StudentProfile, FacultyProfile,
        ]
        for m in models:
            count = m.objects.all().delete()[0]
            if count:
                self.stdout.write(f"  🗑  Deleted {count} {m.__name__} records")
        # Delete all seed users (including admin)
        seed_emails = (
            [f[0] for f in FACULTY_DATA]
            + [s[0] for s in STUDENT_DATA]
            + ["admin@nimbusu.edu"]
        )
        User.objects.filter(email__in=seed_emails).delete()
        Department.objects.all().delete()
        School.objects.all().delete()

    # ── Schools ──────────────────────────────────────────────────────
    def _seed_schools(self):
        schools = {}
        for code, name in SCHOOLS:
            school, created = School.objects.get_or_create(code=code, defaults={"name": name})
            schools[code] = school
            if created:
                self.stdout.write(self.style.SUCCESS(f"  ✅ School: {name}"))
        return schools

    # ── Departments ─────────────────────────────────────────────────
    def _seed_departments(self, schools):
        depts = {}
        for code, name, school_code in DEPARTMENTS:
            dept, created = Department.objects.get_or_create(
                code=code, defaults={"name": name, "school": schools.get(school_code)},
            )
            # Update school link if dept already exists but has no school
            if not created and not dept.school and school_code in schools:
                dept.school = schools[school_code]
                dept.save(update_fields=["school"])
            depts[code] = dept
            if created:
                self.stdout.write(self.style.SUCCESS(f"  ✅ Department: {name} ({school_code})"))
        return depts

    # ── Programs ────────────────────────────────────────────────────
    def _seed_programs(self, depts):
        programs = {}
        for code, name, dept_code, dur, deg in PROGRAMS:
            prog, created = Program.objects.get_or_create(
                code=code,
                defaults={"name": name, "department": depts[dept_code], "duration_years": dur, "degree_type": deg},
            )
            programs[code] = prog
            if created:
                self.stdout.write(self.style.SUCCESS(f"  ✅ Program: {name}"))
        return programs

    # ── Semesters ───────────────────────────────────────────────────
    def _seed_semesters(self):
        semesters = [
            ("Fall 2025", "2025-2026", "2025-08-01", "2025-12-15", False),
            ("Spring 2026", "2025-2026", "2026-01-10", "2026-05-15", True),
        ]
        current = None
        for name, ay, sd, ed, is_curr in semesters:
            sem, created = Semester.objects.get_or_create(
                name=name,
                defaults={"academic_year": ay, "start_date": sd, "end_date": ed, "is_current": is_curr},
            )
            if is_curr:
                current = sem
            if created:
                self.stdout.write(self.style.SUCCESS(f"  ✅ Semester: {name}"))
        return current

    # ── Courses ─────────────────────────────────────────────────────
    def _seed_courses(self, depts):
        courses = {}
        for code, name, dept_code, credits, desc in COURSES:
            course, created = Course.objects.get_or_create(
                code=code,
                defaults={"name": name, "department": depts[dept_code], "credits": credits, "description": desc},
            )
            courses[code] = course
            if created:
                self.stdout.write(self.style.SUCCESS(f"  ✅ Course: {code} — {name}"))
        return courses

    # ── Admin ───────────────────────────────────────────────────────
    def _seed_admin(self, depts):
        admin, created = User.objects.get_or_create(
            email="admin@nimbusu.edu",
            defaults={
                "first_name": "System", "last_name": "Admin", "role": "admin",
                "is_staff": True, "is_superuser": True, "department": depts["CS"],
                "phone": "+91-9000000001",
            },
        )
        if created:
            admin.set_password("Admin@1234")
            admin.save()
            self.stdout.write(self.style.SUCCESS("  ✅ Admin: admin@nimbusu.edu"))
        return admin

    # ── Faculty ─────────────────────────────────────────────────────
    def _seed_faculty(self, depts):
        faculty_users = []
        for email, first, last, dept_code, designation, spec in FACULTY_DATA:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": first, "last_name": last, "role": "faculty",
                    "department": depts[dept_code], "phone": f"+91-9{random.randint(100000000, 999999999)}",
                },
            )
            if created:
                user.set_password("Faculty@1234")
                user.save()
                FacultyProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        "employee_id": f"FAC{random.randint(1000, 9999)}",
                        "designation": designation,
                        "specialization": spec,
                        "joining_date": date(2020, random.randint(1, 12), random.randint(1, 28)),
                    },
                )
                self.stdout.write(self.style.SUCCESS(f"  ✅ Faculty: {first} {last}"))
            faculty_users.append(user)
        return faculty_users

    # ── Students ────────────────────────────────────────────────────
    def _seed_students(self, depts, programs):
        student_users = []
        for i, (email, first, last, dept_code, prog_code, sem, batch_year, batch, division, register_no) in enumerate(STUDENT_DATA):
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": first, "last_name": last, "role": "student",
                    "department": depts[dept_code], "phone": f"+91-9{random.randint(100000000, 999999999)}",
                },
            )
            if created:
                user.set_password("Student@1234")
                user.save()
                StudentProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        "student_id_number": f"NU{batch_year}{i+1:04d}",
                        "register_no": register_no,
                        "program": programs.get(prog_code),
                        "current_semester": sem,
                        "admission_date": date(batch_year, 8, 1),
                        "batch_year": batch_year,
                        "batch": batch,
                        "division": division,
                    },
                )
                self.stdout.write(self.style.SUCCESS(f"  ✅ Student: {first} {last} (Batch {batch}, Div {division})"))
            student_users.append(user)
        return student_users

    # ── Offerings ───────────────────────────────────────────────────
    def _seed_offerings(self, courses, semester, faculty_users):
        offerings = {}
        cs_faculty = [f for f in faculty_users if f.department and f.department.code == "CS"]
        ec_faculty = [f for f in faculty_users if f.department and f.department.code == "EC"]
        me_faculty = [f for f in faculty_users if f.department and f.department.code == "ME"]
        ma_faculty = [f for f in faculty_users if f.department and f.department.code == "MA"]

        faculty_map = {"CS": cs_faculty, "EC": ec_faculty, "ME": me_faculty, "MA": ma_faculty}

        for code, course in courses.items():
            dept_code = course.department.code
            pool = faculty_map.get(dept_code, cs_faculty)
            fac = pool[hash(code) % len(pool)] if pool else faculty_users[0]
            offering, created = CourseOffering.objects.get_or_create(
                course=course, semester=semester, section="A",
                defaults={"faculty": fac, "max_students": 60},
            )
            offerings[code] = offering
            if created:
                self.stdout.write(self.style.SUCCESS(f"  ✅ Offering: {code} by {fac.first_name} {fac.last_name}"))
        return offerings

    # ── Enrollments ─────────────────────────────────────────────────
    def _seed_enrollments(self, student_users, offerings):
        count = 0
        cs_courses = ["CS101", "CS201", "CS301", "CS401", "CS302", "CS402"]
        ec_courses = ["EC201", "EC301"]
        me_courses = ["ME201"]
        general = ["MA101"]

        for stu in student_users:
            dept_code = stu.department.code if stu.department else "CS"
            if dept_code == "CS":
                course_pool = cs_courses + general
            elif dept_code == "EC":
                course_pool = ec_courses + general
            else:
                course_pool = me_courses + general

            # Enroll in 3-5 courses
            chosen = random.sample([c for c in course_pool if c in offerings], min(4, len(course_pool)))
            for code in chosen:
                _, created = Enrollment.objects.get_or_create(
                    student=stu, course_offering=offerings[code], defaults={"status": "active"},
                )
                if created:
                    count += 1
        self.stdout.write(self.style.SUCCESS(f"  ✅ Enrollments: {count} created"))

    # ── Rooms ───────────────────────────────────────────────────────
    def _seed_rooms(self):
        rooms = {}
        for name, building, cap, rtype in ROOMS:
            room, created = Room.objects.get_or_create(
                name=name, defaults={"building": building, "capacity": cap, "room_type": rtype},
            )
            rooms[name] = room
            if created:
                self.stdout.write(self.style.SUCCESS(f"  ✅ Room: {building} — {name}"))
        return rooms

    # ── Timetable ───────────────────────────────────────────────────
    def _seed_timetable(self, offerings, semester):
        # Clear existing timetable entries first
        TimetableEntry.objects.all().delete()

        BATCHES = ["A1", "A2", "B1"]
        LOCATIONS = {
            "classroom": [
                "Main Block Floor 1 Room 101",
                "Main Block Floor 1 Room 102",
                "Main Block Floor 2 Room 201",
                "Main Block Floor 2 Room 202",
                "Academic Block Room 301",
            ],
            "lab": [
                "IT Block CS Lab 1",
                "IT Block CS Lab 2",
                "Electronics Block EC Lab 1",
                "Science Block Physics Lab",
            ],
            "tutorial": [
                "Tutorial Block Room T1",
                "Tutorial Block Room T2",
                "Main Block Floor 1 Room 105",
            ],
        }

        TIME_SLOTS = {
            "classroom": [
                (time(9, 0), time(10, 0)),
                (time(10, 0), time(11, 0)),
                (time(11, 15), time(12, 15)),
                (time(14, 0), time(15, 0)),
                (time(15, 0), time(16, 0)),
            ],
            "lab": [
                (time(9, 0), time(11, 0)),
                (time(11, 15), time(13, 15)),
                (time(14, 0), time(16, 0)),
            ],
            "tutorial": [
                (time(16, 15), time(17, 15)),
                (time(10, 0), time(11, 0)),
            ],
        }

        # Schedule: each offering gets entries across batches with different types
        SCHEDULE = [
            # (course_code, day, batch, subject_type, slot_index, location_index)
            # Monday
            ("CS101", 0, "A1", "classroom", 0, 0),
            ("CS101", 0, "A2", "classroom", 1, 1),
            ("CS201", 0, "A1", "classroom", 2, 2),
            ("CS201", 0, "B1", "lab", 0, 0),
            ("EC201", 0, "A1", "classroom", 3, 3),
            ("MA101", 0, "A1", "classroom", 4, 0),
            ("MA101", 0, "A2", "tutorial", 0, 0),
            # Tuesday
            ("CS301", 1, "A1", "classroom", 0, 0),
            ("CS301", 1, "A2", "classroom", 1, 1),
            ("CS401", 1, "A1", "classroom", 2, 2),
            ("CS101", 1, "B1", "lab", 0, 1),
            ("EC301", 1, "A1", "classroom", 3, 3),
            ("ME201", 1, "A1", "classroom", 4, 4),
            ("CS201", 1, "A2", "tutorial", 0, 1),
            # Wednesday
            ("CS302", 2, "A1", "classroom", 0, 0),
            ("CS302", 2, "A2", "lab", 0, 0),
            ("CS402", 2, "A1", "classroom", 2, 1),
            ("EC201", 2, "B1", "lab", 1, 2),
            ("MA101", 2, "B1", "classroom", 3, 2),
            ("CS401", 2, "A1", "tutorial", 0, 2),
            # Thursday
            ("CS201", 3, "A1", "lab", 0, 0),
            ("CS301", 3, "B1", "classroom", 2, 0),
            ("CS401", 3, "A2", "classroom", 3, 1),
            ("EC301", 3, "A1", "lab", 1, 2),
            ("ME201", 3, "A1", "lab", 2, 3),
            ("CS302", 3, "A1", "tutorial", 1, 0),
            # Friday
            ("CS101", 4, "A1", "classroom", 1, 0),
            ("CS402", 4, "A1", "classroom", 0, 2),
            ("CS402", 4, "B1", "lab", 0, 1),
            ("EC201", 4, "A2", "classroom", 2, 3),
            ("MA101", 4, "A2", "classroom", 3, 0),
            ("CS301", 4, "A1", "tutorial", 0, 0),
            # Saturday
            ("CS201", 5, "A1", "tutorial", 0, 1),
            ("CS401", 5, "B1", "lab", 0, 0),
            ("EC201", 5, "A1", "tutorial", 1, 2),
        ]

        count = 0
        for code, day, batch, stype, slot_idx, loc_idx in SCHEDULE:
            offering = offerings.get(code)
            if not offering:
                continue
            slots = TIME_SLOTS[stype]
            locs = LOCATIONS[stype]
            start_t, end_t = slots[slot_idx % len(slots)]
            location = locs[loc_idx % len(locs)]

            TimetableEntry.objects.create(
                course_offering=offering,
                batch=batch,
                subject_type=stype,
                location=location,
                day_of_week=day,
                start_time=start_t,
                end_time=end_t,
                semester=semester,
            )
            count += 1
        self.stdout.write(self.style.SUCCESS(f"  ✅ Timetable entries: {count}"))

    # ── Assignments ─────────────────────────────────────────────────
    def _seed_assignments(self, offerings, faculty_users, student_users):
        now = timezone.now()
        assignment_data = [
            ("Array Sorting Implementation", "assignment", "CS201", 100, 14),
            ("SQL Query Practice", "assignment", "CS301", 50, 10),
            ("Linear Regression Project", "project", "CS401", 200, 30),
            ("Quiz 1 — Data Structures", "quiz", "CS201", 25, -5),  # past due
            ("Mid-Sem Exam — DBMS", "exam", "CS301", 100, -2),
            ("Python Basics Assignment", "assignment", "CS101", 50, 21),
            ("OS Process Scheduling Report", "assignment", "CS302", 75, 7),
            ("Network Packet Analysis", "project", "CS402", 150, 25),
            ("Digital Logic Quiz", "quiz", "EC201", 30, 3),
            ("Heat Engine Analysis", "assignment", "ME201", 60, 12),
        ]
        a_count = 0
        s_count = 0
        for title, atype, course_code, max_marks, days_offset in assignment_data:
            offering = offerings.get(course_code)
            if not offering:
                continue
            assignment, created = Assignment.objects.get_or_create(
                title=title, course_offering=offering,
                defaults={
                    "description": f"Complete the {title.lower()} as per instructions.",
                    "created_by": offering.faculty,
                    "due_date": now + timedelta(days=days_offset),
                    "max_marks": Decimal(str(max_marks)),
                    "assignment_type": atype,
                    "is_published": True,
                },
            )
            if created:
                a_count += 1
                # Create some submissions for past-due assignments
                if days_offset < 0:
                    enrolled = Enrollment.objects.filter(course_offering=offering).select_related("student")[:5]
                    for enr in enrolled:
                        _, sub_created = Submission.objects.get_or_create(
                            assignment=assignment, student=enr.student,
                            defaults={
                                "text_content": f"Solution submitted by {enr.student.first_name}.",
                                "marks_obtained": Decimal(str(random.randint(int(max_marks * 0.5), max_marks))),
                                "grade": random.choice(["A", "A+", "B+", "B", "A"]),
                                "feedback": "Good work!",
                                "graded_by": offering.faculty,
                                "graded_at": now - timedelta(days=abs(days_offset) - 1),
                                "status": "graded",
                            },
                        )
                        if sub_created:
                            s_count += 1

        self.stdout.write(self.style.SUCCESS(f"  ✅ Assignments: {a_count}, Submissions: {s_count}"))

    # ── Announcements ───────────────────────────────────────────────
    def _seed_announcements(self, admin, faculty_users):
        count = 0
        for i, (title, body, urgent, target) in enumerate(ANNOUNCEMENTS):
            author = admin if i < 5 else random.choice(faculty_users)
            _, created = Announcement.objects.get_or_create(
                title=title,
                defaults={
                    "body": body, "created_by": author, "target_type": target,
                    "is_urgent": urgent, "is_published": True,
                },
            )
            if created:
                count += 1
        self.stdout.write(self.style.SUCCESS(f"  ✅ Announcements: {count}"))

    # ── Content ─────────────────────────────────────────────────────
    def _seed_content(self, offerings, faculty_users):
        # Tags
        tag_objs = {}
        for t in TAGS:
            tag, _ = ContentTag.objects.get_or_create(name=t)
            tag_objs[t] = tag

        # Folder
        folder, _ = ContentFolder.objects.get_or_create(
            name="Course Materials",
            defaults={"created_by": faculty_users[0], "visibility": "public"},
        )

        cs_offering = offerings.get("CS201") or list(offerings.values())[0]
        count = 0
        for title, ctype, desc in CONTENT_ITEMS:
            uploader = random.choice(faculty_users)
            content, created = Content.objects.get_or_create(
                title=title,
                defaults={
                    "description": desc,
                    "content_type": ctype,
                    "uploaded_by": uploader,
                    "folder": folder,
                    "course_offering": cs_offering,
                    "visibility": "course",
                    "is_published": True,
                    "external_url": "https://example.com/resource" if ctype == "link" else None,
                },
            )
            if created:
                content.tags.set(random.sample(list(tag_objs.values()), min(3, len(tag_objs))))
                count += 1
        self.stdout.write(self.style.SUCCESS(f"  ✅ Content items: {count}, Tags: {len(tag_objs)}"))

    # ── Messages ────────────────────────────────────────────────────
    def _seed_messages(self, faculty_users, student_users):
        messages_data = [
            (0, 0, "Doubt in Assignment 1", "Sir, I have a doubt regarding the sorting algorithm implementation."),
            (0, 1, "Re: Doubt in Assignment 1", "Please refer to the lecture notes on merge sort."),
            (1, 0, "Lab Schedule Change", "The lab session for Tuesday has been moved to Thursday."),
            (2, 0, "Project Team Formation", "Please form teams of 3 for the ML project by this Friday."),
            (3, 0, "Grade Query", "Ma'am, my quiz marks seem incorrect. Can you verify?"),
        ]
        count = 0
        for fi, si, subject, body in messages_data:
            fac = faculty_users[fi % len(faculty_users)]
            stu = student_users[si % len(student_users)]
            if fi % 2 == 0:
                sender, receiver = stu, fac
            else:
                sender, receiver = fac, stu
            _, created = Message.objects.get_or_create(
                sender=sender, receiver=receiver, subject=subject,
                defaults={"body": body, "is_read": random.choice([True, False])},
            )
            if created:
                count += 1
        self.stdout.write(self.style.SUCCESS(f"  ✅ Messages: {count}"))

    # ── Notifications ───────────────────────────────────────────────
    def _seed_notifications(self, student_users):
        notif_data = [
            ("New Assignment Posted", "A new assignment has been posted for CS201.", "assignment"),
            ("Exam Schedule Updated", "Mid-semester exam schedule has been published.", "timetable"),
            ("Grade Published", "Your quiz 1 grade has been published.", "grade"),
            ("New Announcement", "Check the latest campus announcement.", "announcement"),
            ("Message Received", "You have a new message from Dr. Priya Sharma.", "message"),
        ]
        count = 0
        for stu in student_users[:5]:
            for title, msg, ntype in notif_data:
                _, created = Notification.objects.get_or_create(
                    user=stu, title=title,
                    defaults={
                        "message": msg, "notification_type": ntype,
                        "channel": "in_app", "is_read": random.choice([True, False]),
                        "status": "delivered",
                    },
                )
                if created:
                    count += 1
        self.stdout.write(self.style.SUCCESS(f"  ✅ Notifications: {count}"))

    # ── Audit Logs ──────────────────────────────────────────────────
    def _seed_audit_logs(self, admin, faculty_users):
        actions = [
            ("LOGIN", "User", "User logged in successfully"),
            ("CREATE_USER", "User", "Created new student account"),
            ("UPDATE_COURSE", "Course", "Updated course syllabus"),
            ("DELETE_ANNOUNCEMENT", "Announcement", "Removed expired announcement"),
            ("RESET_PASSWORD", "User", "Admin reset user password"),
            ("PUBLISH_ASSIGNMENT", "Assignment", "Published new assignment"),
            ("GRADE_SUBMISSION", "Submission", "Graded student submission"),
            ("LOGIN", "User", "User logged in successfully"),
            ("UPDATE_TIMETABLE", "TimetableEntry", "Modified timetable slot"),
            ("UPLOAD_CONTENT", "Content", "Uploaded course material"),
            ("CREATE_ANNOUNCEMENT", "Announcement", "Created urgent announcement"),
            ("EXPORT_GRADES", "Assignment", "Exported grades for CS201"),
            ("LOGIN_FAILED", "User", "Failed login attempt"),
            ("DEACTIVATE_USER", "User", "Deactivated student account"),
            ("CREATE_ENROLLMENT", "Enrollment", "Enrolled student in course"),
        ]
        ips = ["192.168.1.10", "192.168.1.25", "10.0.0.5", "172.16.0.100", "192.168.0.1"]
        count = 0
        users = [admin] + faculty_users
        for action, entity_type, detail in actions:
            user = random.choice(users)
            _, created = AuditLog.objects.get_or_create(
                user=user, action=action, entity_type=entity_type,
                defaults={"details": {"description": detail}, "ip_address": random.choice(ips)},
            )
            if created:
                count += 1
        self.stdout.write(self.style.SUCCESS(f"  ✅ Audit logs: {count}"))
