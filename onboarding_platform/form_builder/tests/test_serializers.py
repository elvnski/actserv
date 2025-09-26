from django.test import TestCase
from form_builder.models import Form, FormField, FormSubmission, SubmissionData, FileAttachment
from form_builder.serializers import FormSerializer
from rest_framework.exceptions import ValidationError
from form_builder.serializers import DynamicSubmissionSerializer
from form_builder.tasks import sendAdminNotification
from django.core import mail



class FormSerializerNestedFieldsTest(TestCase):

    def setUp(self):
        # 1. Initial Form
        self.form = Form.objects.create(

            name = "Initial Form",
            slug = "initial-form",
            is_active = True
        )

        # 2. Initial fields
        self.field_to_keep = FormField.objects.create(

            form = self.form,
            field_name = "clientName",
            field_type = "text",
            label = "Client Name",
            is_required = True,
            order = 1
        )

        self.field_to_update = FormField.objects.create(

            form = self.form,
            field_name = "loanAmount",
            field_type = "number",
            label = "Loan Amount",
            is_required = True,
            order = 2
        )

        self.field_to_delete = FormField.objects.create(

            form = self.form,
            field_name = "oldField",
            field_type = "text",
            label = "Old Field",
            is_required = False,
            order = 3
        )

        self.initial_field_count = FormField.objects.filter(form = self.form).count

    # -------------------------------------------------------------
    # TEST: NESTED CREATION
    # -------------------------------------------------------------

    def test_create_form_and_fields(self):
        """
        Testing one-swoop creation of a Form and its fields
        """
        data = {
            "name": "KYC Form",
            "slug": "kyc-form",
            "is_active": True,
            "fields": [
                {
                    "field_name": "fullName",
                    "field_type": "text",
                    "label": "Full Name",
                    "is_required": True,
                    "order": 1,
                    "configuration": {}
                },
                {
                    "field_name": "dateOfBirth",
                    "field_type": "date",
                    "label": "Date of Birth",
                    "is_required": True,
                    "order": 2,
                    "configuration": {}
                }
            ]
        }

        serializer = FormSerializer(data = data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        form_instance = serializer.save()

        # Checking form instance
        self.assertEqual(form_instance.name, "KYC Form")

        # Checking FormField instances
        fields = form_instance.fields.all()
        self.assertEqual(fields.count(), 2)

        # Checking field details
        self.assertTrue(fields.filter(field_name="fullName").exists())
        self.assertTrue(fields.filter(field_name="dateOfBirth").exists())


    # -------------------------------------------------------------
    # TEST: NESTED UPDATE (Modify, Add, Delete)
    # -------------------------------------------------------------

    def test_update_form_and_fields(self):
        """
        Tests nested update logic: updates form details, modifies an existing field,
        deletes a field, and creates a new field—all in one request.
        """

        # Data reflecting all update operations:
        # 1. Form name change (Form update)
        # 2. field_to_keep remains the same (ID is provided)
        # 3. field_to_update is modified (ID is provided)
        # 4. field_to_delete is absent (Deletion)
        # 5. newField is added (No ID is provided)

        updated_data = {
            "name": "Updated Initial Form Name",
            "slug": "initial-form",  # Should remain the same
            "is_active": False,  # Should be updated
            "fields": [
                {
                    "id": self.field_to_keep.id,
                    "field_name": "clientName",
                    "field_type": "text",
                    "label": "Client Name",
                    "is_required": True,
                    "order": 1,
                    "configuration": {}
                },
                {
                    "id": self.field_to_update.id,
                    "field_name": "loanAmount",
                    "field_type": "text",  # <--- FIELD MODIFICATION (Type changed)
                    "label": "Loan Amount (Modified)",  # <--- FIELD MODIFICATION (Label changed)
                    "is_required": False,  # <--- FIELD MODIFICATION (Required changed)
                    "order": 2,
                    "configuration": {}
                },
                {
                    # New field - no ID provided
                    "field_name": "newField",
                    "field_type": "file_upload",
                    "label": "New File Proof",
                    "is_required": True,
                    "order": 4,
                    "configuration": {}
                }
            ]
        }

        serializer = FormSerializer(instance = self.form, data = updated_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_form = serializer.save()

        # --- A. Verifying Form Update ---
        self.assertEqual(updated_form.name, "Updated Initial Form Name")
        self.assertFalse(updated_form.is_active)

        # --- B. Verifying Field Deletion ---
        self.assertFalse(FormField.objects.filter(id = self.field_to_delete.id).exists())

        # --- C. Verifying Field count (should be 3)
        self.assertEqual(updated_form.fields.count(), 3)

        # --- D. Verifying Field Modification ---
        modified_field = FormField.objects.get(id = self.field_to_update.id)
        self.assertEqual(modified_field.label, "Loan Amount (Modified)")
        self.assertEqual(modified_field.field_type, "text")
        self.assertFalse(modified_field.is_required)

        # --- E. Verifying New Field Creation ---
        new_field = FormField.objects.get(field_name = "newField")
        self.assertIsNotNone(new_field)
        self.assertEqual(new_field.label, "New File Proof")
        self.assertEqual(new_field.field_type, "file_upload")


class DynamicSubmissionSerializerTest(TestCase):

    @classmethod
    def setUpTestData(self):

        # 1. Creating ze test form
        self.form = Form.objects.create(
            name = "Test Validation Form",
            slug = "test-validation",
            is_active = True
        )

        # 2. Creating required fields
        self.required_text_field = FormField.objects.create(
            form = self.form,
            field_name = "clientName",
            field_type = "text",
            label = "Client Name",
            is_required = True
        )

        self.required_number_field = FormField.objects.create(
            form = self.form,
            field_name = "loanAmount",
            field_type = "number",
            label = "Loan Amount",
            is_required = True
        )


        # 3. Creating optional fields
        self.optional_field = FormField.objects.create(
            form = self.form,
            field_name = "notes",
            field_type = "text",
            label = "Notes",
            is_required = False
        )

        # 4. Creating a file upload field
        self.file_field = FormField.objects.create(
            form = self.form,
            field_name = "incomeFile",
            field_type = "file_upload",
            label = "Income Proof",
            is_required = True
        )

    # -------------------------------------------------------------
    # TEST: SUCCESSFUL SUBMISSION
    # -------------------------------------------------------------
    def test_valid_data_passes(self):

        """Testing that a submission with all required fields passes validation."""
        data = {
            'formSlug': 'test-validation',
            'clientIdentifier': 'CUST-001',
            'submissionData': {
                'clientName': 'Jane Doe',
                'loanAmount': '250000',  # Passed as string, as expected from form data
                'notes': 'No special notes',
                # File upload fields are validated in the view, not here
                'incomeFile': 'placeholder'
            }
        }

        serializer = DynamicSubmissionSerializer(data = data)

        # We assert that is_valid() returns True
        self.assertTrue(serializer.is_valid(), serializer.errors)

        # Verify the submission object can be created (calls .create())
        submission = serializer.save()
        self.assertEqual(submission.form, self.form)
        self.assertEqual(submission.client_identifier, 'CUST-001')
        self.assertEqual(submission.data_entries.count(), 4)



    # -------------------------------------------------------------
    # TEST: REQUIRED FIELD VALIDATION
    # -------------------------------------------------------------
    def test_missing_required_field_fails(self):
        """Testing failure if a required text field is missing."""
        data = {
            'formSlug': 'test-validation',
            'submissionData': {
                # 'clientName' is missing
                'loanAmount': '250000',
            }
        }
        serializer = DynamicSubmissionSerializer(data = data)

        self.assertFalse(serializer.is_valid())

        self.assertIn('clientName', serializer.errors)
        self.assertIn('is required', serializer.errors['clientName'][0])


    # -------------------------------------------------------------
    # TEST: NUMBER FIELD VALIDATION
    # -------------------------------------------------------------
    def test_non_digit_in_number_field_fails(self):
        """Testing that a number field will reject a non-digit input."""
        data = {
            'formSlug': 'test-validation',
            'submissionData': {
                'clientName': 'Jane Doe',
                'loanAmount': 'ABC',  # Invalid input for number field
            }
        }
        serializer = DynamicSubmissionSerializer(data=data)

        # We expect validation to fail and raise ValidationError
        with self.assertRaises(ValidationError) as cm:
            serializer.is_valid(raise_exception=True)

        self.assertIn('loanAmount', cm.exception.detail)
        self.assertIn('valid number', cm.exception.detail['loanAmount'][0])


class CeleryTaskTest(TestCase):

    def setUp(self):


        # 1. Creating a test form
        self.form = Form.objects.create(

            name = "Test Notification Form",
            slug = "test-notify",
            is_active = True
        )

        # 2. Creating fields for data extraction
        self.field1 = FormField.objects.create(

            form = self.form,
            field_name = "clientName",
            field_type = "text",
            label = "Client Name",
            is_required = True
        )

        self.field2 = FormField.objects.create(

            form = self.form,
            field_name = "loanAmount",
            field_type = "number",
            label = "Loan Amount",
            is_required = True
        )

        # 3. Creating a submission instance
        self.submission = FormSubmission.objects.create(

            form = self.form,
            client_identifier = 'CUST-TEST-999'
        )

        # 4. Creating related data entries
        SubmissionData.objects.create(

            submission = self.submission,
            field_name = self.field1.field_name,
            value = "Alice Smith"
        )

        SubmissionData.objects.create(

            submission = self.submission,
            field_name = self.field2.field_name,
            value = "150000"
        )

        # 5. Creating a file attachment
        self.file_attachment = FileAttachment.objects.create(

            submission = self.submission,
            field_name = 'proofOfIncome',
            file = 'test_uploads/income_proof.pdf'  # Mocked file path
        )


    # -------------------------------------------------------------
    # TEST: EMAIL CONTENT AND EXECUTION
    # -------------------------------------------------------------
    def test_send_admin_notification_task(self):
        """Tests that the Celery task sends one email with the correct content."""

        # 1. Run the task synchronously (Celery tasks can be called like normal functions in tests)
        sendAdminNotification(self.submission.id)

        # 2. Assert that one email was sent
        self.assertEqual(len(mail.outbox), 1)

        # 3. Getting the sent email object
        email = mail.outbox[0]

        # 4. Assert the Subject line is correct
        expected_subject = f"New Form Submission: {self.form.name} (ID: {self.submission.id})"
        self.assertEqual(email.subject, expected_subject)

        # 5. Assert the body contains the correct data
        email_body = email.body

        # Checking Identifier
        self.assertIn("Client Identifier: CUST-TEST-999", email_body)

        # Checking Submission Data
        self.assertIn("clientName: Alice Smith", email_body)
        self.assertIn("loanAmount: 150000", email_body)

        # Checking File Attachment using ze mocked file path)
        expected_file_path = f"/test_uploads/income_proof.pdf"
        self.assertIn(f"Attached Files: \n - proofOfIncome: {expected_file_path}", email_body)

        # 6. Assert recipient and sender are correct
        self.assertIn('admin@yourcompany.com', email.to)
        self.assertEqual(email.from_email, 'no-reply@onboarding.com')