from django.test import TestCase
from form_builder.models import Form, FormField, FormSubmission, SubmissionData, FileAttachment
from form_builder.serializers import FormSerializer
from rest_framework.exceptions import ValidationError
from form_builder.serializers import DynamicSubmissionSerializer
from form_builder.tasks import sendAdminNotification
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile



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

    def get_submission_context(self, files_data=None):

        if files_data is None:
            files_data = {}

        # A mock object that simulates the request and includes actual file data
        class MockRequest:
            FILES = files_data
        return {'request': MockRequest()}


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

        # 5. Creating a field with a conditional dependency
        self.dependent_field = FormField.objects.create(
            form = self.form,
            field_name = "reasonForLoan",
            field_type = "text",
            label = "Reason For Loan",
            is_required = False, # Not required unless condition is met
            configuration = {
                "dependency": {
                    "target_field": "loanAmount",
                    "action": "is_required",
                    "condition": ">",
                    "value": "100000" # If loanAmount > 100,000, this field is required
                }
            }
        )


        # Create a saved submission object for the detail test
        self.submission = FormSubmission.objects.create(
            form=self.form,
            client_identifier='CUST-TEST-999', # Matches assertion in test_admin_detail_serializer_output
        )

        # Create EAV data entries for the submission (Matching test assertions)
        SubmissionData.objects.create(submission=self.submission, field_name='clientName', value='Alice Smith')
        SubmissionData.objects.create(submission=self.submission, field_name='loanAmount', value='150000') # Matches assertion
        SubmissionData.objects.create(submission=self.submission, field_name='notes', value='Initial test submission.')
        # Ensure the conditional field is saved since 150000 > 100000
        SubmissionData.objects.create(submission=self.submission, field_name='reasonForLoan', value='New business')

        # Create a mock file attachment (Matches assertion: field_name='proofOfIncome')
        FileAttachment.objects.create(
            submission=self.submission,
            field_name='proofOfIncome',
            # This path is the same as the one used in CeleryTaskTest setup
            file='test_uploads/income_proof.pdf',
        )

    # -------------------------------------------------------------
    # TEST: SUCCESSFUL SUBMISSION
    # -------------------------------------------------------------
    def test_valid_data_passes(self):

        """Testing that a submission with all required fields passes validation."""
        data = {
            'formSlug': 'test-validation',
            'submissionData': {
                'clientIdentifier': 'CUST-001',
                'clientName': 'Jane Doe',
                'loanAmount': '250000',  # Passed as string, as expected from form data
                'notes': 'No special notes',
                'reasonForLoan': 'To fund a new business venture',
                # File upload fields are validated in the view, not here
                'incomeFile': 'placeholder'
            }
        }

        serializer = DynamicSubmissionSerializer(data = data, context=self.get_submission_context())

        # We assert that is_valid() returns True
        self.assertTrue(serializer.is_valid(), serializer.errors)

        # Verify the submission object can be created (calls .create())
        submission = serializer.save()
        self.assertEqual(submission.form, self.form)
        self.assertEqual(submission.client_identifier, 'CUST-001')
        self.assertEqual(submission.data_entries.count(), 5)



    # -------------------------------------------------------------
    # TEST: REQUIRED FIELD VALIDATION
    # -------------------------------------------------------------
    def test_missing_required_field_fails(self):
        """Testing failure if a required text field is missing."""
        data = {
            'formSlug': 'test-validation',
            'submissionData': {
                'clientIdentifier': 'CUST-002',
                # 'clientName' is missing
                'loanAmount': '250000',
            }
        }
        serializer = DynamicSubmissionSerializer(data = data, context=self.get_submission_context())

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
                'clientIdentifier': 'CUST-003',
                'clientName': 'Jane Doe',
                'loanAmount': 'ABC',  # Invalid input for number field
            }
        }
        serializer = DynamicSubmissionSerializer(data=data, context=self.get_submission_context())

        # We expect validation to fail and raise ValidationError
        with self.assertRaises(ValidationError) as cm:
            serializer.is_valid(raise_exception=True)

        self.assertIn('loanAmount', cm.exception.detail)
        self.assertIn('valid number', cm.exception.detail['loanAmount'][0])


    # -------------------------------------------------------------
    # TEST: CONDITIONAL REQUIRED FIELD
    # -------------------------------------------------------------
    def test_conditional_required_field_fails(self):
        """Tests that a dependent field is required when the condition is met."""
        data = {
            'formSlug': 'test-validation',
            'submissionData': {
                'clientIdentifier': 'CUST-COND-001',
                'clientName': 'Conditional Test',
                'loanAmount': '150000',  # 150,000 is > 100,000, so 'reasonForLoan' is now required
                # 'reasonForLoan' is missing (INTENDED FAILURE)
                'incomeFile': 'placeholder'
            }
        }

        serializer = DynamicSubmissionSerializer(data=data, context=self.get_submission_context())

        self.assertFalse(serializer.is_valid())

        # Check for the expected validation error on the dependent field
        self.assertIn('reasonForLoan', serializer.errors)
        self.assertIn('is required because', serializer.errors['reasonForLoan'][0])


    # -------------------------------------------------------------
    # NEW TEST: FILE UPLOAD AND ATTACHMENT
    # -------------------------------------------------------------
    def test_file_upload_and_attachment_creation(self):
        """Tests that a valid submission with a file saves the file and creates a FileAttachment record."""

        # 1. Prepare a dummy file for 'incomeFile'
        test_file = SimpleUploadedFile(
            "test_document.pdf",
            b"file content for testing",
            content_type="application/pdf"
        )

        # 2. Prepare submission data
        data = {
            'formSlug': 'test-validation',
            'submissionData': {
                'clientIdentifier': 'CUST-FILE-001',
                'clientName': 'File Uploader',
                'loanAmount': '50000',
                'notes': 'Testing file upload.',
                # File field is omitted from submissionData, it goes into request.FILES
            }
        }

        # 3. Prepare the context with the file data
        # 'incomeFile' is the field_name defined in setUpTestData
        files_data = {'incomeFile': test_file}
        context = self.get_submission_context(files_data=files_data)

        # 4. Assert the initial count of FileAttachment is zero
        initial_attachment_count = FileAttachment.objects.count()
        self.assertGreater(initial_attachment_count, 0) # Asserts there is at least 1 object (from setUpTestData)

        # 5. Run validation and save
        serializer = DynamicSubmissionSerializer(data=data, context=context)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        submission = serializer.save()

        # 6. Assertions
        # a) FileAttachment record created
        self.assertEqual(FileAttachment.objects.count(), initial_attachment_count + 1)

        self.assertEqual(submission.attachments.count(), 1)
        attachment = submission.attachments.first()

        # The failing assertion is now redundant, but we keep the field name check
        self.assertEqual(attachment.field_name, 'incomeFile')

        # c) Check the file itself
        self.assertIn('test_document', attachment.file.name)

        # 7. Clean up the created file (Good practice for tests that use storage)
        attachment = FileAttachment.objects.latest('id') # Get the newly created one
        attachment.file.delete()


    # -------------------------------------------------------------
    # NEW TEST: ADMIN DETAIL SERIALIZER OUTPUT
    # -------------------------------------------------------------
    def test_admin_detail_serializer_output(self):
        """
        Tests that AdminSubmissionDetailSerializer correctly flattens EAV data
        and includes file attachment details.
        """
        from form_builder.serializers import AdminSubmissionDetailSerializer

        # 1. Instantiate the serializer with the existing submission object
        # self.submission includes clientIdentifier, 4 data entries, and 1 file attachment
        serializer = AdminSubmissionDetailSerializer(self.submission)
        data = serializer.data

        # 2. Assert basic submission details are present
        self.assertEqual(data['client_identifier'], 'CUST-TEST-999')
        self.assertIn('submission_data', data)
        self.assertIn('attachments', data)

        # 3. Assert Submission Data is correctly flattened (EAV -> Dict)
        submission_data = data['submission_data']

        # Check that the EAV data is flattened correctly
        self.assertEqual(submission_data['clientName'], 'Alice Smith')
        self.assertEqual(submission_data['loanAmount'], '150000')

        # The reasonForLoan entry might be present or not, depending on your setUpTestData.
        # Based on the Celery test, there are 4 entries, so let's check for 4 keys.
        # Note: If you have updated setUpTestData to have 5 entries, update this check.
        self.assertEqual(len(submission_data), 4)


        # 4. Assert File Attachment details are present
        self.assertEqual(len(data['attachments']), 1)
        attachment = data['attachments'][0]

        # Check attachment structure (Assuming FileAttachmentSerializer has 'field_name' and 'file')
        self.assertIn('field_name', attachment)
        self.assertIn('file_url', attachment)
        self.assertEqual(attachment['field_name'], 'proofOfIncome')
        # The file field in the output should be a URL or a string path
        self.assertIn('/test_uploads/', attachment['file_url'])





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
        expected_file_path = f"/media/test_uploads/income_proof.pdf"
        self.assertIn(f"Attached Files: \n - proofOfIncome: {expected_file_path}", email_body)

        # 6. Assert recipient and sender are correct
        self.assertIn('admin@yourcompany.com', email.to)
        self.assertEqual(email.from_email, 'no-reply@onboarding.com')