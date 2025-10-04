import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './admin.css';


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

    useEffect(() => {
        // NOTE: Authentication must be handled by providing an auth token in the api.ts filr

        axios.get<SubmissionSummary[]>(ADMIN_SUBMISSIONS_API_URL)
            .then(response => {
                setSubmissions(response.data);
            })
            .catch(err => {
                console.error("Failed to fetch submissions:", err.response?.data || err);
                // Important: Admin endpoints require authentication. If this fails,
                // it's often a token issue.
                setError("Failed to load submissions. Check API connection or Admin authentication.");
            })
            .finally(() => setIsLoading(false));
    }, []);

    const formatDateTime = (isoString: string) => {
        if (!isoString) return 'N/A';
        return new Date(isoString).toLocaleString();
    };

    return (
        <div className="admin-container">
            <header className="admin-header">
                <h1 className="admin-title">Client Submissions Review</h1>
            </header>

            {error && <div className="alert-danger">{error}</div>}

            {isLoading ? (
                <p>Loading submissions...</p>
            ) : submissions.length === 0 ? (
                <p>No submissions have been recorded yet.</p>
            ) : (
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
                                {/* Link to the detail view */}
                                <Link to={`/admin/submissions/${sub.id}`} className="btn-secondary btn-sm">
                                    View Details
                                </Link>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default AdminSubmissionList;