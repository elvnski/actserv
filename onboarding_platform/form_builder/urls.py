# form_builder/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
# CORRECT: Relative import for views within the same app
from .views import (
    FormAdminViewSet,
    ClientSubmissionAPIView,
    ClientFormListView,
    ClientFormDetailView,
    AdminSubmissionViewSet,
)

router = DefaultRouter()
router.register(r'forms', FormAdminViewSet, basename='form-admin')
router.register(r'submissions', AdminSubmissionViewSet, basename='submission-admin')


urlpatterns = [

    # =====================================================================
    # ADMIN API ENDPOINTS (Includes forms and submissions routes)
    # =====================================================================
    path('admin/', include(router.urls)), # Forms and Submissions are now under /api/admin/


    # =====================================================================
    # CLIENT API ENDPOINTS
    # =====================================================================
    path('client/submissions/', ClientSubmissionAPIView.as_view(), name='client-submission'),
    path('client/forms/', ClientFormListView.as_view(), name='client-form-list'),
    path('client/forms/<str:slug>/', ClientFormDetailView.as_view(), name='client-form-detail'),
]