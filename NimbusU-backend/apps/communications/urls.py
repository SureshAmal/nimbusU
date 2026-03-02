"""URL routing for the communications app."""

from django.urls import path

from . import views

app_name = "communications"

urlpatterns = [
    # Announcements
    path("communications/announcements/", views.AnnouncementListCreateView.as_view(), name="announcement-list-create"),
    path("communications/announcements/<uuid:pk>/", views.AnnouncementDetailView.as_view(), name="announcement-detail"),
    # Messages
    path("communications/messages/", views.MessageListCreateView.as_view(), name="message-list-create"),
    path("communications/messages/<uuid:pk>/", views.MessageDetailView.as_view(), name="message-detail"),
    # Forums
    path("communications/forums/", views.ForumListCreateView.as_view(), name="forum-list-create"),
    path("communications/forums/<uuid:pk>/", views.ForumDetailView.as_view(), name="forum-detail"),
    path("communications/forums/<uuid:pk>/posts/", views.ForumPostCreateView.as_view(), name="forum-post-create"),
    path("communications/forums/<uuid:forum_id>/posts/<uuid:pk>/", views.ForumPostEditView.as_view(), name="forum-post-edit"),
    path("communications/forums/<uuid:forum_id>/posts/<uuid:pk>/delete/", views.ForumPostDeleteView.as_view(), name="forum-post-delete"),
    # Notifications
    path("notifications/", views.NotificationListView.as_view(), name="notification-list"),
    path("notifications/unread-count/", views.UnreadCountView.as_view(), name="unread-count"),
    path("notifications/read-all/", views.NotificationReadAllView.as_view(), name="read-all"),
    path("notifications/preferences/", views.NotificationPreferencesView.as_view(), name="notification-preferences"),
    path("notifications/preferences/<uuid:pk>/", views.NotificationPreferenceUpdateView.as_view(), name="notification-preference-update"),
    path("notifications/<uuid:pk>/read/", views.NotificationMarkReadView.as_view(), name="notification-mark-read"),
    # Admin
    path("notifications/admin/stats/", views.NotificationAdminStatsView.as_view(), name="notification-admin-stats"),
]
