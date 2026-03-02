"""URL routing for the content app."""

from django.urls import path

from . import views

app_name = "content"

urlpatterns = [
    # Folders
    path("content/folders/", views.ContentFolderListCreateView.as_view(), name="folder-list-create"),
    path("content/folders/<uuid:pk>/", views.ContentFolderDetailView.as_view(), name="folder-detail"),
    # Content
    path("content/", views.ContentListCreateView.as_view(), name="content-list-create"),
    path("content/recent/", views.RecentContentView.as_view(), name="content-recent"),
    path("content/<uuid:pk>/", views.ContentDetailView.as_view(), name="content-detail"),
    path("content/<uuid:pk>/download/", views.ContentDownloadView.as_view(), name="content-download"),
    path("content/<uuid:pk>/stats/", views.ContentStatsView.as_view(), name="content-stats"),
    # Tags
    path("content/tags/", views.ContentTagListCreateView.as_view(), name="tag-list-create"),
    # Bookmarks
    path("content/bookmarks/", views.BookmarkListCreateView.as_view(), name="bookmark-list-create"),
    path("content/bookmarks/<uuid:pk>/", views.BookmarkDeleteView.as_view(), name="bookmark-delete"),
]
