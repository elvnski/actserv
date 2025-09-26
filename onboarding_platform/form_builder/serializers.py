from django.db import transaction
from rest_framework import serializers
from .models import Form, FormField, FormSubmission, SubmissionData
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
    """
    Handles inbound client data for specific a form
    Does not map to a model: handles saving related data manually
    """

    # 1. Incoming Fields
    # These match the keys the React Frontend sends in the POST request
    formSlug = serializers.SlugField(write_only = True)
    clientIdentifier = serializers.CharField(required = False, allow_blank = True)

    # submissionData will contain the dynamic key-value pairs of client inputs
    submissionData = serializers.DictField(
        child = serializers.CharField(required = False, allow_null = True)
    )

    def validate(self, data):

        formSlug = data['formSlug']
        submissionData = data['submissionData']

        # 1. Check if the form exists and is active
        try:
            self.formInstance = Form.objects.get(slug = formSlug, is_active = True)
        except Form.DoesNotExist:
            raise serializers.ValidationError({"formSlug": "Form not found or is inactive"})

        # 2. Dynamic Validation Against FormField rules
        formFields = self.formInstance.fields.all()

        for field in formFields:
            value = submissionData.get(field.field_name)

            # --- Check 1: Required Fields  ---
            if field.is_required and not value and field.field_type != 'file_upload':
                raise serializers.ValidationError({field.field_name: f"{field.label} is required"})

            # --- Check 2: Basic Type Validation  ---
            if field.field_type == 'number' and value and not str(value).isdigit():
                raise serializers.ValidationError({field.field_name: "Must be a valid number"})

        return data


    def create(self, validated_data):

        formInstance = self.formInstance
        submissionData = validated_data['submissionData']
        clientIdentifier = validated_data.get('clientIdentifier')

        with transaction.atomic():
            # 1. Create the main submission record
            submission = FormSubmission.objects.create(
                form = formInstance,
                client_identifier = clientIdentifier
            )

            # 2. Storing the data
            for field_name, value in submissionData.items():
                if value is not None and value != '':
                    SubmissionData.objects.create(
                        submission = submission,
                        field_name = field_name,
                        value = str(value)
                    )

            # 3. Trigger the asynchronous notification task
            sendAdminNotification.delay(submission.id)

            return submission

