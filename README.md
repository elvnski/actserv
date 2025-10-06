# 📝 Django Dynamic Form Builder API

This project implements a robust, dynamic form and submission management system using Django and Django REST Framework (DRF). The core design principle was **Form Follows Function**, leading to a primary focus on building an optimized and secure **backend architecture**. 

This system is built around the flexible **Entity-Attribute-Value (EAV pattern)** to handle dynamic form schemas, process client submissions with file uploads, and provide secure, feature-rich Admin and Public APIs. This architectural solidity ensures that the UI is built upon a scalable and high-performance foundation, capable of being evolved into a highly interactive and themed interface incorporating richer states, data visualization, and modern effects using libraries such as GSAP, Three.js, or Framer Motion.

Looking ahead, the current architecture offers several clear paths for backend scalability. To handle massive submission volumes, the system could be migrated to a serverless architecture (e.g., AWS Lambda, Google Cloud Functions) for cost-efficient, auto-scaling submission processing. Caching strategies using Redis or Memcached could be introduced at the API gateway or database layer (e.g., Django's `select_related`/`prefetch_related` caching) to drastically reduce latency for frequently accessed form schemas. Finally, the Celery worker pool could be segmented into dedicated queues—one for high-priority notifications and another for long-running batch processing or third-party integrations (e.g., CRM synchronization)—ensuring critical administrative tasks are never delayed by heavy workloads.

The choice of **React** for the frontend admin panel was strategic, leveraging its component-based architecture and robust ecosystem to ensure the UI is inherently scalable and maintainable. This decision creates unique future scaling opportunities, such as implementing **Module Federation** to allow separate teams to own and deploy features (e.g., a "Form Editor Module" and a "Submission Viewer Module") independently. Furthermore, adopting advanced **State Management patterns** (like Redux Toolkit or Zustand) will prevent prop-drilling as the application grows, and utilizing **progressive rendering techniques** (e.g., Virtualized Lists for large datasets) will keep the Admin dashboard fast and responsive, regardless of the complexity or volume of data flowing from the optimized Django backend.

## ✨ Key Features & Architectural Design

| Feature | Design Choice | Technical Implementation |
| :--- | :--- | :--- |
| **Dynamic Form Schema** | **EAV Pattern** | `Form`, `FormField`, and `SubmissionData` models allow admins to modify fields without database migrations. |
| **API Architecture** | **DRF ViewSets & Routers** | Dedicated and segmented endpoints: `/api/admin/` (Secure) and `/api/client/` (Public). |
| **Client Submission** | **Dynamic Serializers & Transactions** | `DynamicSubmissionSerializer` validates data against live EAV rules, handles file uploads, and uses `django.db.transaction` for atomic data saving. |
| **Asynchronous Notifications** | **Celery Integration** | A custom `sendAdminNotification` task is triggered post-submission, ensuring fast client response times while email sending occurs in the background. |
| **Admin UI Optimization** | **Server-Side Control** | The `AdminSubmissionViewSet` implements **Server-Side Pagination**, **Sorting**, and **Global Search** (using DRF Filters), perfectly optimized for a modern frontend (like React with TanStack Table). |
| **Security** | **Permission Classes** | Strict use of `IsAdminUser` for all Admin API endpoints and `is_active=True` queryset filtering for all Client API endpoints. |

***

## 🛠️ Project Setup: Running Locally

Follow these steps to set up and run the project locally.

### 1. Prerequisites

Ensure you have the following installed:
* Python (3.8+)
* Docker or WSL (Recommended for running Redis/Celery)

### 2. Backend Setup (Django)

Initialize your environment and install dependencies.

```bash
# 1. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 2. Install core dependencies
# Assuming you have a requirements.txt, otherwise install:
# pip install django djangorestframework django-environ celery redis
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Make sure to check the **`settings.py`** file and configure the required settings as per your development encironment. The Celery and file storage settings are essential for full functionality.

```bash
# settings.py file snippet

# Base settings
SECRET_KEY='your-secret-key-here-for-security'
DEBUG=True
ALLOWED_HOSTS='localhost,127.0.0.1'

# Database 
DATABASE_URL='sqlite:///db.sqlite3' 

# Media Storage (File Uploads)
MEDIA_ROOT=BASE_DIR
MEDIA_URL='/media/'

# Asynchronous Tasks (Celery/Redis)
CELERY_BROKER_URL='redis://localhost:6379/0' # If using Redis locally
CELERY_RESULT_BACKEND='redis://localhost:6379/0'

# Email Notification (For submission notification task)
EMAIL_BACKEND='django.core.mail.backends.console.EmailBackend' # Displays email content in the console for testing
```

### 4. Database, Superuser and Server Start

Once the dependencies are installed and the environment variables are configured, these commands initialize the database schema, create the necessary **Superuser** credentials for API access, and finally launch the Django development server. Note that the database migrations (Step 1) must be run before the server can start.

```bash
# 1. Run migrations
python manage.py makemigrations form_builder
python manage.py migrate

# 2. Create a superuser (required to access Admin API endpoints)
python manage.py createsuperuser

# 3. Run the development server
python manage.py runserver
```

### 5. Running Celery Worker

The asynchronous notification task requires a running Celery worker, configured to use the `eventlet` pool for high concurrency.

```bash
# Open a new terminal and activate your virtual environment (.venv)

# 1. Ensure Redis is running (e.g., via Docker or WSL)
# 2. Start the Celery worker using eventlet
celery -A your_project_name worker -l info -P eventlet
```

## 🌎 API Endpoints Overview

The API is separated by consumer type to enforce security and access rules.

### 1. Admin API (`/api/admin/`)

Requires **Superuser/Admin Authentication** (`IsAdminUser` permission class).

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/admin/forms/` | `GET`, `POST` | Form Template CRUD (includes nested FormFields). |
| `/api/admin/submissions/` | `GET` | **Master List View** (Paginated, Sortable, Searchable). |
| `/api/admin/submissions/{id}/` | `GET` | Submission Detail (EAV data and File Attachment details). |

### 2. Client API (`/api/client/`)

**Publicly Accessible** (`AllowAny` permission class). Only exposes forms where `is_active=True`.

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/client/forms/` | `GET` | List active forms (summary view). |
| `/api/client/forms/{slug}/` | `GET` | Retrieve full schema for a specific active form. |
| `/api/client/submissions/` | `POST` | Handle client form data submission and file uploads. |

## 🧪 Testing and Verification

To ensure the integrity and reliability of this complex application, a comprehensive suite of 15 unit tests was developed, focusing specifically on critical business logic. These tests validate the core architectural choices, including the **Entity-Attribute-Value (EAV)** implementation for dynamic data storage, the **security boundaries** separating Admin and Client APIs, and the seamless integration of **asynchronous tasks (Celery)**. 

This rigorous testing approach guarantees that new form configurations, user submissions, file uploads, and notification processes function exactly as designed under all expected conditions.

The table below outlines the details of all 15 unit tests:

| Test Name/Group | Test File | Purpose & Verification |
| :--- | :--- | :--- |
| `test_create_form_and_fields` | `test_serializers.py` | Verifies **Nested Creation** of a Form and its EAV-based FormFields in a single request. |
| `test_update_form_and_fields` | `test_serializers.py` | Verifies **Nested Update Logic**: updates form details, modifies, deletes, and adds fields in one atomic transaction. |
| `test_valid_submission_creates_eav_and_file_records` | `test_serializers.py` | Confirms a complete, valid client submission successfully creates `FormSubmission`, EAV data (`SubmissionData`), and links `FileAttachment` records. |
| `test_required_field_validation_fails` | `test_serializers.py` | Validates **Dynamic Schema Validation**: ensures a `ValidationError` is correctly raised when a required EAV field is missing. |
| `test_submission_with_missing_optional_field_succeeds` | `test_serializers.py` | Verifies submission success when a non-required field is intentionally omitted, confirming validation precision. |
| `test_submission_with_file_upload_succeeds` | `test_serializers.py` | Confirms the serializer correctly processes file uploads, creates the file on disk, and records the `FileAttachment`. |
| `test_conditional_required_field_is_enforced` | `test_serializers.py` | Validates **Conditional Logic**: ensures a dependent field becomes required when its condition is met (e.g., loan amount > $100k). |
| `test_conditional_required_field_is_optional_when_condition_not_met` | `test_serializers.py` | Validates **Conditional Logic**: ensures a dependent field remains optional when its condition is not met. |
| `test_admin_detail_serializer_output` | `test_serializers.py` | Verifies the EAV data is correctly aggregated and transformed into a flat, readable dictionary for the Admin Detail View. |
| `test_send_admin_notification_task` | `test_serializers.py` | Assures **Celery Task Execution**: verifies one email is sent with the correct subject, EAV data, and file attachment links. |
| `test_admin_access_requires_authentication` | `test_views.py` | **Admin Security:** Tests that an unauthenticated request to any admin endpoint is rejected with a `401 Unauthorized`. |
| `test_authenticated_admin_access_succeeds` | `test_views.py` | **Admin Security:** Confirms that an authenticated superuser is successfully granted access (`200 OK`) to Admin API endpoints. |
| `test_authenticated_standard_user_access_fails` | `test_views.py` | **Admin Security:** Ensures a standard authenticated user is denied access (`403 Forbidden`) to Admin API endpoints. |
| `test_client_list_only_returns_active_forms` | `test_views.py` | **Public Filtering:** Verifies the public list view correctly filters and only returns forms marked as `is_active=True`. |
| `test_client_detail_retrieves_active_form_schema` | `test_views.py` | **Public Schema Retrieval:** Confirms the client can retrieve the full schema (including nested fields) for an active form via its slug. |


**To run all tests:**

```bash
python manage.py test form_builder
```


## 🚀 Conclusion: Project Summary

This project successfully delivers a **Full-Stack, production-ready Form Builder API**. It features an advanced **EAV architecture** for flexible schema management, robust **file handling**, and **asynchronous processing via Celery** for admin notifications. 

The Admin API is specifically optimized with **server-side pagination, sorting, and searching** to interface seamlessly with modern frontends (like TanStack Table). This structure ensures the application is highly scalable, secure, and maintainable, satisfying all requirements for dynamic content generation and secure data management.

## 💼 A Message to the Recruiter

Thank you for the opportunity to complete this assessment. Working through the complexities of dynamic serialization, EAV design, and integrating modern tooling like Celery and DRF filters has been both challenging and exceptionally rewarding. 

The experience has only amplified my interest and passion for the backend logic and full-stack development. I am highly enthusiastic about the prospect of bringing this dedicated and comprehensive approach to the Full Stack Developer role at Actserv and look forward to further correspondence.