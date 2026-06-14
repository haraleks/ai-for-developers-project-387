from django.urls import path
from . import views

urlpatterns = [
    # Public (Guest)
    path("users", views.UserListView.as_view()),
    path("users/<int:userId>/calendars", views.UserCalendarListView.as_view()),
    path("users/<int:userId>/calendars/<int:calendarId>/event-types", views.CalendarEventTypeListView.as_view()),
    path("users/<int:userId>/calendars/<int:calendarId>/event-types/<int:id>", views.CalendarEventTypeDetailView.as_view()),
    path("users/<int:userId>/calendars/<int:calendarId>/event-types/<int:id>/slots", views.SlotListView.as_view()),
    path("bookings", views.BookingCreateView.as_view()),
    # Auth
    path("auth/register", views.RegisterView.as_view()),
    path("auth/login", views.LoginView.as_view()),
    # Owner
    path("owner/calendars", views.OwnerCalendarListView.as_view()),
    path("owner/calendars/<int:id>", views.OwnerCalendarDetailView.as_view()),
    path("owner/calendars/<int:calendarId>/event-types", views.OwnerEventTypeListView.as_view()),
    path("owner/calendars/<int:calendarId>/event-types/<int:id>", views.OwnerEventTypeDetailView.as_view()),
    path("owner/calendars/<int:calendarId>/schedule", views.OwnerScheduleView.as_view()),
    path("owner/calendars/<int:calendarId>/bookings", views.OwnerBookingListView.as_view()),
]
