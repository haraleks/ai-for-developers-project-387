from django.urls import path

from . import views

urlpatterns = [
    path("event-types", views.EventTypeListView.as_view()),
    path("event-types/<int:id>", views.EventTypeDetailView.as_view()),
    path("event-types/<int:id>/slots", views.SlotListView.as_view()),
    path("bookings", views.BookingCreateView.as_view()),
    path("owner/schedule", views.OwnerScheduleView.as_view()),
    path("owner/bookings", views.OwnerBookingListView.as_view()),
]
