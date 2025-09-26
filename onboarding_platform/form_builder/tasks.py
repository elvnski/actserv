from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from .models import FormSubmission, SubmissionData, FileAttachment

@shared_task
def sendAdminNotification(submissionId):
    """
    Asynchronously fetches submission data and sends a notification email to the admin
    """
    try:
        # Grabbing the submission and related data in one swoop
        submission = FormSubmission.objects.prefetch_related('data_entries', 'attachments', 'form').get(id = submissionId)
    except FormSubmission.DoesNotExist:
        print(f"Error: Submission ID {submissionId} not found for notification")
        return

    # 1. Prep ze email bowdy
    formName = submission.form.name
    submissionId = submission.id
    clientIdentifier = submission.client_identifier or 'N/A'

    submissionDetails = f"Client Identifier: {clientIdentifier}\n"

    for dataItem in submission.data_entries.all():
        submissionDetails += f" - {dataItem.field_name}: {dataItem.value}\n"

    # Add file attachments details
    if submission.attachments.exists():
        fileDetails = "\nAttached Files: \n"

        for file in submission.attachments.all():
            fileDetails += f" - {file.field_name}: {file.file.url}\n"

        submissionDetails += fileDetails

    # 2 Construct and send ze mail
    subject = f"New Form Submission: {formName} (ID: {submissionId})"
    message = f"A new submission has been received for the {formName} form.\n\nDetails:\n{submissionDetails}"
    fromEmail = settings.DEFAULT_FROM_EMAIL
    recipientList = [settings.ADMIN_EMAIL_FOR_NOTIFICATIONS]

    try:
        send_mail(subject, message, fromEmail, recipientList, fail_silently = False)
        submission.is_notified = True
        submission.save()
        print(f"Successfully sent notification for Submission ID: {submissionId}")
    except Exception as e:
        print(f"Failed to send email for Submission ID {submissionId}: {e}")



