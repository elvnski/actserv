from django.db import models
from django.db.models import JSONField


class Form(models.Model):
    """Defines a customizable form template (e.g., 'KYC Form')."""
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True, default='')
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class FormField(models.Model):
    """Defines the fields that belong to a specific Form."""
    FIELD_TYPES = (
        ('text', 'Text Input'),
        ('number', 'Number Input'),
        ('date', 'Date Picker'),
        ('dropdown', 'Dropdown Select'),
        ('checkbox', 'Checkbox'),
        ('file_upload', 'File Upload'), # For document uploads [cite: 12, 15]
    )

    form = models.ForeignKey(Form, related_name = 'fields', on_delete = models.CASCADE)
    field_name = models.CharField(max_length=100)  # Used as the key for data storage [cite: 24]
    field_type = models.CharField(max_length=50, choices=FIELD_TYPES)
    label = models.CharField(max_length=255)  # Human-readable label
    is_required = models.BooleanField(default=False)
    order = models.IntegerField(default=0)  # For displaying fields in order

    # Stores field-specific logic (dropdown options, min/max values, validation rules, etc.)
    configuration = models.JSONField(default=dict) # Use JSONField for flexibility [cite: 9, 23]

    class Meta:
        # Ensures field names are unique only within the context of a specific form
        unique_together = ('form', 'field_name')
        ordering = ['order']

    def __str__(self):
        return f'{self.form.name} - {self.label}'


class FormSubmission(models.Model):
    """Tracks an instance of a client submitting a form."""
    form = models.ForeignKey(Form, on_delete=models.CASCADE)
    client_identifier = models.CharField(max_length=255, blank=True, null=True) # e.g., Session ID, User ID
    submission_date = models.DateTimeField(auto_now_add=True)
    is_notified = models.BooleanField(default=False)

    def __str__(self):
        return f'Submission #{self.id} for {self.form.name}'


class SubmissionData(models.Model):
    """Stores the submitted client data in a flexible key-value format."""
    submission = models.ForeignKey(
        FormSubmission,
        related_name = 'data_entries',
        on_delete=models.CASCADE
    )
    field_name = models.CharField(max_length=100) # Key from FormField

    # The 'value' stores the actual data, e.g., text, number, selected option, etc.
    # This design is key for future-proofing; schema changes don't affect old data [cite: 20]
    value = models.TextField() # Use TextField for simple data storage (since files go to FileAttachment)

    class Meta:
        unique_together = ('submission', 'field_name')

class FileAttachment(models.Model):
    """Handles document uploads separately."""
    submission = models.ForeignKey(FormSubmission, related_name='attachments', on_delete=models.CASCADE)
    field_name = models.CharField(max_length=100) # Links the file to the correct form field
    file = models.FileField(upload_to='form_uploads/') # Stores the file itself [cite: 12, 22]
    uploaded_at = models.DateTimeField(auto_now_add=True)
