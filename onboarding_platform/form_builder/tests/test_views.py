from django.urls import reverse
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from form_builder.models import Form, FormField

User = get_user_model()

# The URL for the Form List endpoint (assuming your admin URLs are set up here)
FORM_LIST_URL = reverse('form-admin-list') # Assumes router is set up, or use reverse('form_list')

class AdminAPISecurityTest(APITestCase):

    @classmethod
    def setUpTestData(cls):
        # 1. Create a non-superuser, standard user
        cls.user = User.objects.create_user(
            username='testuser',
            password='testpassword'
        )

        # 2. Create a superuser (who should have access)
        cls.superuser = User.objects.create_superuser(
            username='admin',
            password='adminpassword',
            email='admin@example.com'
        )

        # 3. Create a test form to ensure the view returns data
        cls.test_form = Form.objects.create(
            name="Secure Test Form",
            slug="secure-test-form",
            is_active=True
        )

    def test_admin_access_requires_authentication(self):
        """
        Tests that an unauthenticated request to an admin endpoint
        is rejected with 401 Unauthorized.
        """
        # Do NOT authenticate the client
        response = self.client.get(FORM_LIST_URL)

        # We expect a 401 Unauthorized response from the permission check
        self.assertEqual(response.status_code, 401)
        self.assertIn('Authentication credentials were not provided', str(response.data))

    def test_authenticated_admin_access_succeeds(self):
        """
        Tests that an authenticated request from a superuser succeeds
        and returns the expected data (200 OK).
        """
        # Authenticate the client using the superuser credentials
        self.client.force_authenticate(user=self.superuser)

        response = self.client.get(FORM_LIST_URL)

        # We expect a 200 OK response
        self.assertEqual(response.status_code, 200)

        # Check that the response contains the test form data
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['slug'], 'secure-test-form')

    def test_authenticated_standard_user_access_fails(self):
        """
        Tests that a standard authenticated user (who is not admin/staff)
        cannot access the admin endpoints (depending on your permission setup,
        this should fail if you use IsAdminUser or IsAuthenticatedOrReadOnly).

        NOTE: This test assumes only staff/admin should have access to CRUD operations.
        If your view only uses IsAuthenticated, this test will pass 200 and should be removed.
        """
        # Authenticate the client using the standard user
        self.client.force_authenticate(user=self.user)

        # Attempt to create a new form (a restricted action)
        new_form_data = {'name': 'New Form', 'slug': 'new-form', 'is_active': True}
        response = self.client.post(FORM_LIST_URL, data=new_form_data, format='json')

        # If your permission class is IsAuthenticated, this will be 201.
        # If your permission class is IsAdminUser or IsStaff, this will be 403.
        # Assuming you want only admin/staff to create forms:
        self.assertEqual(response.status_code, 403)
        self.assertIn('You do not have permission', str(response.data))


# URLs for the Client API (using the names from form_builder/urls.py)
CLIENT_LIST_URL = reverse('client-form-list')
# The detail URL requires a slug placeholder
CLIENT_DETAIL_URL = lambda slug: reverse('client-form-detail', kwargs={'slug': slug})


class ClientAPITest(APITestCase):

    @classmethod
    def setUpTestData(cls):
        # 1. Create an ACTIVE form (should be visible)
        cls.active_form = Form.objects.create(
            name="Public Loan Form",
            slug="public-loan",
            is_active=True
        )
        FormField.objects.create(form=cls.active_form, field_name="loanAmount", field_type="number", label="Loan", order=1)

        # 2. Create an INACTIVE form (should NOT be visible)
        cls.inactive_form = Form.objects.create(
            name="Internal Admin Form",
            slug="internal-admin",
            is_active=False
        )

    def test_client_list_only_shows_active_forms(self):
        """
        Tests that the ClientFormListView (public list) only returns forms
        where is_active=True.
        """
        response = self.client.get(CLIENT_LIST_URL)

        # 1. Assert successful response
        self.assertEqual(response.status_code, 200)

        # 2. Assert only one form is returned (the active one)
        self.assertEqual(len(response.data), 1)

        # 3. Assert the returned form is the correct active one
        self.assertEqual(response.data[0]['slug'], 'public-loan')
        self.assertNotIn('internal-admin', [f['slug'] for f in response.data])


    def test_client_detail_retrieves_active_form_schema(self):
        """
        Tests that the ClientFormDetailView retrieves the full schema
        for an active form by slug.
        """
        url = CLIENT_DETAIL_URL(slug=self.active_form.slug)
        response = self.client.get(url)

        # 1. Assert successful response
        self.assertEqual(response.status_code, 200)

        # 2. Assert data integrity (check for nested fields)
        self.assertEqual(response.data['slug'], 'public-loan')
        self.assertEqual(len(response.data['fields']), 1)
        self.assertEqual(response.data['fields'][0]['field_name'], 'loanAmount')


    def test_client_detail_rejects_inactive_form(self):
        """
        Tests that the ClientFormDetailView returns 404 Not Found
        for an inactive form.
        """
        url = CLIENT_DETAIL_URL(slug=self.inactive_form.slug)
        response = self.client.get(url)

        # The view's queryset filters for is_active=True, so a non-matching
        # (inactive) form should result in a 404 Not Found.
        self.assertEqual(response.status_code, 404)