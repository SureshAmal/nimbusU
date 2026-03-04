import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.assignments.models import Assignment, Submission
from apps.timetable.models import AttendanceRecord
from .models import Notification

logger = logging.getLogger(__name__)


def create_notification(user, title, message, notif_type, ref_type=None, ref_id=None):
    """Helper to create a unified notification."""
    Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notif_type,
        reference_type=ref_type,
        reference_id=ref_id,
        channel=Notification.Channel.IN_APP,
    )


@receiver(post_save, sender=Assignment)
def notify_new_assignment(sender, instance, created, **kwargs):
    if created and instance.is_published:
        # Enrolled students should be notified
        enrollments = \
            instance.course_offering.enrollments.filter(status="enrolled").select_related("student")
        for enrollment in enrollments:
            create_notification(
                user=enrollment.student,
                title=f"New Assignment: {instance.title}",
                message=f"A new assignment has been posted in {instance.course_offering.course.name}.",
                notif_type=Notification.NotificationType.ASSIGNMENT,
                ref_type="assignment",
                ref_id=instance.id,
            )


@receiver(post_save, sender=Submission)
def notify_graded_submission(sender, instance, **kwargs):
    # If the submission was just graded or returned
    if instance.status == "graded" and getattr(instance, "_was_graded", False) is False:
        # We can implement a tracker field locally to not re-spam, 
        # but for simplicity we rely on the object state change
        create_notification(
            user=instance.student,
            title=f"Assignment Graded: {instance.assignment.title}",
            message=f"Your submission for {instance.assignment.title} has been graded. Marks: {instance.marks_obtained}",
            notif_type=Notification.NotificationType.GRADE,
            ref_type="submission",
            ref_id=instance.id,
        )


@receiver(post_save, sender=AttendanceRecord)
def notify_low_attendance(sender, instance, **kwargs):
    # This might be too noisy to run on *every* absent, so typically we run it as a daily cron.
    # For demonstration of signals, we'll notify if it's explicitly marked absent.
    if instance.status == AttendanceRecord.Status.ABSENT:
        create_notification(
            user=instance.student,
            title="Attendance Alert",
            message=f"You were marked absent for {instance.timetable_entry.course_offering.course.name} on {instance.date}.",
            notif_type=Notification.NotificationType.TIMETABLE,
            ref_type="attendance_record",
            ref_id=instance.id,
        )
