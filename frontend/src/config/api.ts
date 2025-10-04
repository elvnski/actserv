// src/utils/api.ts

// The base URL for all your Django API endpoints
export const BASE_API_URL = 'http://127.0.0.1:8000/api/';

// The base URL for the admin-specific endpoints
export const ADMIN_API_URL = `${BASE_API_URL}admin/`;

// Your superuser's Token Key
export const AUTH_TOKEN = '9b027cdb9661faa967f00c4b35b17b7627df11fb';

// Standard header value for Django REST Framework Token Auth
export const AUTH_HEADER_VALUE = `Token ${AUTH_TOKEN}`;