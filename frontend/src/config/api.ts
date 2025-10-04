// src/utils/api.ts

export const BASE_API_URL = 'http://127.0.0.1:8000/api/';
export const ADMIN_API_URL = `${BASE_API_URL}admin/`;
// 🌟 NEW: Define the new login endpoint URL
export const LOGIN_API_URL = `${BASE_API_URL}auth/login/`;

// Used to fetch form structure by slug: /api/client/forms/{slug}/
export const CLIENT_FORM_DETAIL_ENDPOINT = `${BASE_API_URL}client/forms/`;

// Used to submit form data: /api/client/submissions/
export const CLIENT_SUBMISSION_ENDPOINT = `${BASE_API_URL}client/submissions/`;

// Admin Endpoints (Protected - Authentication Token MUST be provided to these)
export const ADMIN_SUBMISSIONS_ENDPOINT = `${ADMIN_API_URL}submissions/`;
export const ADMIN_FORMS_ENDPOINT = `${ADMIN_API_URL}forms/`;

