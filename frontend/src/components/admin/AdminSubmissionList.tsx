import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './admin.css';
import { useAdminAuth } from './context/AdminAuthContext.tsx';
import { useNavigate } from 'react-router-dom';


interface SubmissionSummary {
    id: number;
    form_name: string;
    submission_date: string; // ISO string format from Django
    client_identifier: string;
    is_notified: boolean;
}


const ADMIN_SUBMISSIONS_API_URL = 'http://127.0.0.1:8000/api/admin/submissions/';


const AdminSubmissionList = () => {
    const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { logout, isAuthReady } = useAdminAuth();
    const navigate = useNavigate();

    useEffect(() => {

        if (!isAuthReady) {
            // Keep loading state true while waiting for context
            return;
        }

        // If the component gets here, the global Axios header is set (if a token exists).
        axios.get<SubmissionSummary[]>(ADMIN_SUBMISSIONS_API_URL)
            .then(response => {
                setSubmissions(response.data);
                setError(null);
            })
            .catch(err => {
                // If the error is a 401/403, and the user IS logged in, something is wrong.
                // If the error is due to an expired token, the user might need to log in again.
                console.error("Failed to fetch submissions:", err.response?.data || err);
                setError("Failed to load submissions. Check API connection or Admin authentication.");
                setSubmissions([]); // Ensure old submissions aren't displayed on error
            })
            .finally(() => setIsLoading(false));

    }, [isAuthReady]);


    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };


    const formatDateTime = (isoString: string) => {
        if (!isoString) return 'N/A';
        return new Date(isoString).toLocaleString();
    };

    return (
        <div className="admin-container">

            <header className="admin-header">
                <h1 className="admin-title">Client Submissions Review</h1>

                <nav className="admin-nav">
                    <Link to="/admin/forms" className="btn-secondary btn-sm" style={{marginRight: '10px'}}>
                        Form Builder
                    </Link>
                    <button onClick={handleLogout} className="btn-secondary btn-sm">
                        Logout
                    </button>
                </nav>
            </header>

            {/* 1. Show Loading State While fetching data */}
            {isLoading ? (
                <p>Loading submissions...</p>
            ) : (
                // 2. Once loading is complete (isLoading === false)
                <>
                    {/* A. Show Error Message ONLY if error is present */}
                    {error && <div className="alert-danger">{error}</div>}

                    {/* B. Show Table or Empty Message based on submissions data */}
                    {submissions.length === 0 ? (
                        <p>No submissions have been recorded yet.</p>
                    ) : (
                        // Render the table only if there is data
                        <table className="admin-table">
                            <thead>
                            <tr>
                                <th>ID</th>
                                <th>Form Name</th>
                                <th>Submitted On</th>
                                <th>Client Identifier</th>
                                <th>Notified</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {submissions.map(sub => (
                                <tr key={sub.id}>
                                    <td style={{ color: 'black' }}>{sub.id}</td>
                                    <td style={{ color: 'black' }}>{sub.form_name}</td>
                                    <td style={{ color: 'black' }}>{formatDateTime(sub.submission_date)}</td>
                                    <td style={{ color: 'black' }}>{sub.client_identifier || 'N/A'}</td>
                                    <td>
                                            <span className={`status-badge ${sub.is_notified ? 'status-success' : 'status-pending'}`}>
                                                {sub.is_notified ? 'Yes' : 'No'}
                                            </span>
                                    </td>
                                    <td>
                                        <Link to={`/admin/submissions/${sub.id}`} className="btn-secondary btn-sm">
                                            View Details
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminSubmissionList;