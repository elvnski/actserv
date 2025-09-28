from django.db import transaction
from rest_framework import serializers
from .models import Form, FormField, FormSubmission, SubmissionData, FileAttachment
from .tasks import sendAdminNotification


# Serializer for FormField (used nested within Form for admin setup)
class FormFieldSerializer(serializers.ModelSerializer):

    id = serializers.IntegerField(required=False, read_only=False)

    class Meta:
        model = FormField
        fields  = ['id', 'field_name', 'field_type', 'label', 'is_required', 'order', 'configuration']


# Serializer for Form (used for CRUD operations on the form template)
class FormSerializer(serializers.ModelSerializer):
    # Nested serializer to handle fields creation/update directly via the Form endpoint
    fields = FormFieldSerializer(many = True, required = False)

    class Meta:
        model = Form
        fields = ['id', 'name', 'slug', 'is_active', 'fields']

    # Override create/update to handle nested FormField creation/update
    def create(self, validated_data):

        fields_data = validated_data.pop('fields', [])
        form = Form.objects.create(**validated_data)
        for field_data in fields_data:
            FormField.objects.create(form=form, **field_data)

        return form

    def update(self, instance, validated_data):
        fields_data = validated_data.pop('fields', [])

        # 1. Update Form instance fields
        instance.name = validated_data.get('name', instance.name)
        instance.slug = validated_data.get('slug', instance.slug)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        instance.save()

        # 2. Handle nested FormField updates
        existing_field_ids = [field.id for field in instance.fields.all()]
        fields_to_keep = []

        for field_data in fields_data:
            field_id = field_data.get('id', None)

            if field_id:
                field = FormField.objects.get(id = field_id, form = instance)

                # UPDATE existing field
                field.field_name = field_data.get('field_name', field.field_name)
                field.field_type = field_data.get('field_type', field.field_type)
                field.label = field_data.get('label', field.label)
                field.is_required = field_data.get('is_required', field.is_required)
                field.order = field_data.get('order', field.order)
                field.configuration = field_data.get('configuration', field.configuration)

                field.save()

                fields_to_keep.append(field.id)
            else:
                # CREATE new field
                new_field = FormField.objects.create(form=instance, **field_data)
                fields_to_keep.append(new_field.id)

        # 3. DELETE fields removed by the admin (the flexibility requirement)
        FormField.objects.filter(form = instance).exclude(id__in=fields_to_keep).delete()

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

            # Check 2: Basic Type Validation
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