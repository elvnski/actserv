from django.db import transaction
from rest_framework import serializers
from .models import Form, FormField, FormSubmission, SubmissionData, FileAttachment
from .tasks import sendAdminNotification


# Serializer for FormField (used nested within Form for admin setup)
class FormFieldSerializer(serializers.ModelSerializer):

    id = serializers.IntegerField(required=False, allow_null=True)

    configuration = serializers.JSONField(required=False, allow_null=True)

    class Meta:
        model = FormField
        fields  = ['id', 'field_name', 'field_type', 'label', 'is_required', 'order', 'configuration']


# Serializer for Form (used for CRUD operations on the form template)
class FormSerializer(serializers.ModelSerializer):
    # Nested serializer to handle fields creation/update directly via the Form endpoint
    fields = FormFieldSerializer(many = True, required = False)

    description = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Form
        fields = ['id', 'name', 'slug', 'description', 'is_active', 'fields']

    # Override create/update to handle nested FormField creation/update
    def create(self, validated_data):

        fields_data = validated_data.pop('fields', [])
        form = Form.objects.create(**validated_data)
        for field_data in fields_data:
            FormField.objects.create(form=form, **field_data)

        return form

    @transaction.atomic
    def update(self, instance, validated_data):
        fields_data = validated_data.pop('fields', [])

        # 1. Update Form instance fields
        instance.name = validated_data.get('name', instance.name)
        instance.slug = validated_data.get('slug', instance.slug)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        instance.description = validated_data.get('description', instance.description)
        instance.save()

        # 2. Handle nested FormField updates
        existing_field_ids = set(instance.fields.values_list('id', flat=True))
        fields_to_keep = set()

        for field_data in fields_data:

            field_id = field_data.get('id', None)

            if isinstance(field_id, int) and field_id in existing_field_ids:

                # UPDATE existing field
                field = FormField.objects.get(id = field_id, form = instance)

                # UPDATE existing field
                field.field_name = field_data.get('field_name', field.field_name)
                field.field_type = field_data.get('field_type', field.field_type)
                field.label = field_data.get('label', field.label)
                field.is_required = field_data.get('is_required', field.is_required)
                field.order = field_data.get('order', field.order)
                field.configuration = field_data.get('configuration', field.configuration)

                field.save()

                fields_to_keep.add(field.id)
            else:

                # Remove the temporary frontend ID (which is not an integer)
                field_data.pop('id', None)

                # CREATE new field
                new_field = FormField.objects.create(form=instance, **field_data)
                fields_to_keep.add(new_field.id)


        # 3. DELETE fields removed by the admin

        # Find all field IDs that exist in the DB but were NOT submitted by the frontend
        fields_to_delete = existing_field_ids - fields_to_keep

        FormField.objects.filter(form=instance, id__in=fields_to_delete).delete()

        return instance


class DynamicSubmissionSerializer(serializers.Serializer):

    formSlug = serializers.SlugField(write_only=True)

    submissionData = serializers.JSONField(write_only=True)

    def validate(self, data):

        # 1. JSONField did the parsing for us. We now have a dictionary.
        nestedData = data['submissionData']

        # --- 2. Flatten and Merge Data for Validation ---

        # Start with the dynamic fields from the JSON string
        flattenedData = {}
        flattenedData.update(nestedData)

        # Merge uploaded files from the request
        fileData = self.context['request'].FILES
        flattenedData.update(fileData)

        # Store the necessary keys for the create method.
        # Note: We can remove data['submissionData'] here, as nested_data holds the value
        # and we don't need the key in the final output.
        data['nested_data'] = nestedData
        data['flattened_data'] = flattenedData

        # --- 3. Pre-Validation Checks (Form Exists & Client Identifier) ---

        form_slug = data['formSlug']
        try:
            self.formInstance = Form.objects.get(slug=form_slug, is_active=True)
        except Form.DoesNotExist:
            raise serializers.ValidationError({"formSlug": "Form not found or is inactive"})

        # The key field for the FormSubmission model must be present
        clientIdentifierValue = flattenedData.get('clientIdentifier')
        if not clientIdentifierValue:
             raise serializers.ValidationError({"clientIdentifier": "This field may not be null. (Must be provided in submissionData)"})

        data['clientIdentifier'] = clientIdentifierValue # Store for create()

        # --- 4. Dynamic Validation Against FormField rules (Uses Flattened Data) ---

        formFields = self.formInstance.fields.all()

        for field in formFields:
            # Look up value from the flattened data
            value = flattenedData.get(field.field_name)

            # Check 1: Required Fields
            if field.is_required and not value and field.field_type != 'file_upload':
                raise serializers.ValidationError({field.field_name: f"{field.label} is required"})


            # Check 2: Conditional Validation (Dependency Check)
            dependency = field.configuration.get('dependency')

            if dependency and dependency.get('target_field') and dependency.get('action') == 'is_required':

                target_field_name = dependency['target_field']
                condition = dependency['condition']
                required_value = dependency['value']

                # Get the value of the target field from the submitted data
                target_value = data['flattened_data'].get(target_field_name)

                condition_met = False

                # Try to compare as numbers (covers the 'loan amount > X' case)
                try:
                    target_num = float(target_value) if target_value is not None and target_value != '' else 0.0
                    required_num = float(required_value)

                    if condition == '>' and target_num > required_num:
                        condition_met = True
                    elif condition == '<' and target_num < required_num:
                        condition_met = True
                    # You can add more numeric conditions here (==, >=, <=)

                except (TypeError, ValueError):
                    # Fallback or skip if not numeric (e.g., condition is 'has_value')
                    pass

                # Enforce the requirement if the condition is met
                if condition_met:
                    # Check if the dependent field (current field) has a value
                    if not value:
                        raise serializers.ValidationError({field.field_name: f"{field.label} is required because '{target_field_name}' condition was met."})


            # Check 3: Basic Type Validation
            if field.field_type == 'number' and value and not str(value).isdigit():
                raise serializers.ValidationError({field.field_name: "Must be a valid number"})

        return data


    def create(self, validated_data):

        formInstance = self.formInstance

        # Retrieve the data required for saving
        submissionDataToSave = validated_data['nested_data']
        clientIdentifier = validated_data['clientIdentifier']
        fileData = self.context['request'].FILES

        with transaction.atomic():

            # 1. Create the main submission record
            submission = FormSubmission.objects.create(
                form=formInstance,
                client_identifier=clientIdentifier
            )

            # 2. Storing non-file data
            for field_name, value in submissionDataToSave.items():

                if field_name == 'clientIdentifier':
                    continue

                if value is not None and value != '':
                    SubmissionData.objects.create(
                        submission=submission,
                        field_name=field_name,
                        value=str(value)
                    )

            # 3. Handle File Uploads (save files here)
            for field_name, file_object in fileData.items():
                 FileAttachment.objects.create(
                                submission=submission,
                                field_name=field_name,
                                file=file_object
                            )

            # 4. Trigger the asynchronous notification task
            sendAdminNotification.delay(submission.id)

            return submission


# --- Serializer for the Public Form List ---
class ClientFormSummarySerializer(serializers.ModelSerializer):

    class Meta:
        model = Form
        fields = ('name', 'slug', 'description')


# ======================================================================
# ADMIN SUBMISSION SERIALIZERS
# ======================================================================

class AdminFileAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for file attachments linked to a submission."""
    # This generates the full URL to the file for downloading
    file_url = serializers.FileField(source='file', read_only=True)

    class Meta:
        model = FileAttachment
        # Use uploaded_at as per your models.py
        fields = ('field_name', 'file_url', 'uploaded_at')
        read_only_fields = fields

class AdminSubmissionDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer for a single form submission."""
    form_name = serializers.CharField(source='form.name', read_only=True)

    # 1. Custom field to convert SubmissionData EAV entries into a dictionary
    submission_data = serializers.SerializerMethodField()

    # 2. Retrieve all related file attachments (using related_name='attachments')
    attachments = AdminFileAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = FormSubmission
        # Use submission_date as per your models.py
        fields = ('id', 'form_name', 'client_identifier', 'submission_date', 'is_notified', 'submission_data', 'attachments')
        read_only_fields = fields

    def get_submission_data(self, instance: FormSubmission) -> dict:
        """
        Converts the EAV model (SubmissionData instances) into a flat key-value dictionary.
        Uses the ForeignKey related_name 'data_entries' from SubmissionData.
        """
        data_dict = {}
        # Iterate over all SubmissionData entries related to this submission
        for entry in instance.data_entries.all():
            data_dict[entry.field_name] = entry.value
        return data_dict


class AdminSubmissionListSerializer(serializers.ModelSerializer):
    """Summary serializer for the submission list view."""
    form_name = serializers.CharField(source='form.name', read_only=True)

    class Meta:
        model = FormSubmission
        # Use submission_date and is_notified for the list view
        fields = ('id', 'form_name', 'submission_date', 'client_identifier', 'is_notified')
        read_only_fields = fields


class ClientFormDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for the public client to retrieve a form definition.
    """

    fields = FormFieldSerializer(many=True, read_only=True)

    class Meta:
        model = Form
        fields = ['id', 'name', 'slug', 'description', 'fields']
        read_only_fields = fields