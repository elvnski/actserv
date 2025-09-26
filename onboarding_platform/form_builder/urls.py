from django.urls import path, include
from rest_framework.routers import DefaultRouter
# CORRECT: Relative import for views within the same app
from .views import FormAdminViewSet, ClientSubmissionAPIView

router = DefaultRouter()
router.register(r'forms', FormAdminViewSet, basename='form-admin')

urlpatterns = [
    # =====================================================================
    # ADMIN API ENDPOINTS (Includes all routes from the router)
    # =====================================================================
    path('admin/', include(router.urls)),

    # =====================================================================
    # CLIENT API ENDPOINTS
    # =====================================================================
    path('submit/', ClientSubmissionAPIView.as_view(), name='client-submission'),
]