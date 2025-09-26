from django.core.files.uploadedfile import UploadedFile
from rest_framework import viewsets, status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Form, FileAttachment
from .serializers import FormSerializer, DynamicSubmissionSerializer
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

    def post(self, request, format = None):

        # Step 1: Separate file data from regular form data
        data = request.data.copy()
        files = {}
        submissionData = {}

        formSlug = data.get('formSlug')
        clientIdentifier = data.get('clientIdentifier')

        # Parse incoming data
        for key, value in data.items():
            if key in ['formSlug', 'clientIdentifier']:
                continue
            elif isinstance(value, UploadedFile):
                files[key] = value
            else:
                # Capture all other dynamic fields into the submissionData dictionary
                submissionData[key] = value


        # Prepare data structure for the DynamicSubmissionSerializer
        serializerData = {
            'formSlug': formSlug,
            'clientIdentifier': clientIdentifier,
            'submissionData': submissionData
        }

        # Step 2: Validate the non-file data using DynamicSerializer
        serializer = DynamicSubmissionSerializer(data = serializerData)

        if serializer.is_valid():
            # Step 3: save the submission record and dynamic data
            submission = serializer.save()

            # Step 4: Handle File Attachments (Multiple per form)
            for fieldName, uploadedFile in files.items():
                FileAttachment.objects.create(
                    submission = submission,
                    field_name = fieldName,
                    file = uploadedFile
                )

            # Step 5: Trigger the async notification task
            sendAdminNotification.delay(submission.id)


            return Response(
                {
                    'submissionId': submission.id,
                    'status': 'Submission successful. Notification Processing'
                },
                status = status.HTTP_201_CREATED
            )

        # Return validation errors from the serializer
        return Response(serializer.errors, status = status.HTTP_400_BAD_REQUEST)