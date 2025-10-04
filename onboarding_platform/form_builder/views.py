from django.core.files.uploadedfile import UploadedFile
from rest_framework import viewsets, status, permissions
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import Form, FileAttachment, FormSubmission
from .serializers import FormSerializer, DynamicSubmissionSerializer, ClientFormSummarySerializer, AdminSubmissionListSerializer, AdminSubmissionDetailSerializer
from .tasks import sendAdminNotification

# =========================================================
# 1. Admin API ViewSet (For Form Configuration)
# =========================================================

class FormAdminViewSet(viewsets.ModelViewSet):
    """
    Handles CRUD operations (Create, Retrieve, Update, Destroy) for the
    Form model and its nested FormField models.

    This API is used by the Admin UI (React) for form configuration.
    """
    queryset = Form.objects.prefetch_related('fields').all()
    serializer_class = FormSerializer
    lookup_field = 'slug'

# =========================================================
# 2. Client API Views (Placeholder)
# =========================================================

class ClientSubmissionAPIView(APIView):
    """
   Handles client submissions, file uploads, dynamic validation, and saves data
   across FormSubmission, SubmissionData, and FileAttachment models.
    """

    # We allow unauthenticated users (clients) to post a submission
    # permission_classes = [AllowAny]

    def post(self, request, format=None):

        serializer = DynamicSubmissionSerializer(data=request.data, context={'request': request})

        if serializer.is_valid():

            submission = serializer.save()

            return Response(
                {
                    'submissionId': submission.id,
                    'status': 'Submission successful. Notification Processing'
                },
                status=status.HTTP_201_CREATED
            )

        # Return validation errors from the serializer
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# --- Public View for Client Form List ---
class ClientFormListView(generics.ListAPIView):
    """
    Publicly accessible endpoint to list all active Form summaries.
    """
    queryset = Form.objects.filter(is_active=True).order_by('name')
    serializer_class = ClientFormSummarySerializer
    permission_classes = [AllowAny]

# --- Public View for Client Form Detail (Next Step) ---
class ClientFormDetailView(generics.RetrieveAPIView):
    """
    Publicly accessible endpoint to retrieve the full schema for one active form by slug.
    """
    queryset = Form.objects.filter(is_active=True)
    serializer_class = ClientFormSummarySerializer # Will need to be updated to FormSchemaSerializer later
    lookup_field = 'slug'
    permission_classes = [AllowAny]


# ======================================================================
# NEW ADMIN SUBMISSION VIEWSET
# ======================================================================

class AdminSubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin-only endpoint for viewing all submitted forms.
    """
    # Use FormSubmission and order by submission_date
    queryset = FormSubmission.objects.all().order_by('-submission_date')

    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get_serializer_class(self):
        """Dynamically choose the serializer based on the action."""
        if self.action == 'list':
            return AdminSubmissionListSerializer
        return AdminSubmissionDetailSerializer