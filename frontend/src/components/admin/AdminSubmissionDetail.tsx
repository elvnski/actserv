import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './admin.css';
import { useAdminAuth } from './context/AdminAuthContext.tsx';
import AdminAppLayout from './AdminAppLayout.tsx';



// Define the interfaces for the detail data (matches AdminSubmissionDetailSerializer)
interface FileAttachment {
    field_name: string;
    file_url: string; // The full URL to download the file
    uploaded_at: string;
}

interface SubmissionDetail {
    id: number;
    form_name: string;
    submission_date: string;
    client_identifier: string;
    is_notified: boolean;
    submission_data: Record<string, string>; // The compiled EAV data (field_name: value)
    attachments: FileAttachment[];
}

const ADMIN_SUBMISSIONS_API_URL = 'http://127.0.0.1:8000/api/admin/submissions/';

const AdminSubmissionDetail = () => {
    const { submissionId } = useParams<{ submissionId: string }>();
    const navigate = useNavigate();

    const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { logout, isAuthReady } = useAdminAuth();


    useEffect(() => {

        if (!isAuthReady) {
            // Keep loading state true while waiting for context
            return;
        }

        if (!submissionId) {
            setError("Submission ID missing.");
            setIsLoading(false);
            return;
        }

        // 💡 NOTE: You still need to ensure your Axios calls include the JWT token
        // for this protected admin endpoint, as discussed in previous steps.

        axios.get<SubmissionDetail>(`${ADMIN_SUBMISSIONS_API_URL}${submissionId}/`)
            .then(response => {
                setSubmission(response.data);
            })
            .catch(err => {
                console.error("Failed to fetch submission detail:", err.response?.data || err);
                setError("Failed to load submission details. Check ID or authentication.");
            })
            .finally(() => setIsLoading(false));
    }, [submissionId, isAuthReady]);

    if (isLoading) return <div className="admin-container">Loading submission details...</div>;
    if (error) return <div className="admin-container alert-danger">{error}</div>;
    if (!submission) return <div className="admin-container">Submission not found.</div>;

    const formatDateTime = (isoString: string) => {
        return isoString ? new Date(isoString).toLocaleString() : 'N/A';
    };

    // Helper function to format field names for display
    const formatFieldName = (key: string): string => {
        // 1. Insert a space before all capitalized letters (except the first character)
        //    Regex explanation: /(?=[A-Z])/ is a positive lookahead that matches a position
        //    immediately followed by an uppercase letter.
        const spaced = key.replace(/([A-Z])/g, ' $1');

        // 2. Trim leading/trailing spaces, capitalize the first letter of the resulting string,
        //    and ensure the rest of the string is lowercase for clean Title Case.
        return spaced.trim()
            .toLowerCase()
            .split(' ')
            .map(word => {
                if (!word) return ''; // Skip if a space was inserted at the start
                return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join(' ');
    };


    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    // Define navigation links for this specific page
    const navLinks = {
        toFormBuilder: { to: '/admin/forms', text: 'Manage Forms' },
        toSubmissions: { to: '/admin/submissions', text: 'Go to Submissions Page' },
    };

    return (

        <AdminAppLayout
            pageTitle={`Submission #${submission.id} of form '${submission.form_name}'`}
            pageSubtitle="View form entries & submitted files."
            navLink1={navLinks.toFormBuilder}
            navLink2={navLinks.toSubmissions}
            actionButton={{
                text: 'Log Out',
                onClick: handleLogout
            }}
        >

            <div className="admin-container">
                {/*<header className="admin-header">*/}
                {/*    <h1 className="admin-title">Submission Review: #{submission.id}</h1>*/}
                {/*    <button onClick={() => navigate(-1)} className="btn-secondary"  style={{ marginLeft: '15px' }}>*/}
                {/*        ← Back to List*/}
                {/*    </button>*/}
                {/*</header>*/}

                {/* Submission Meta Data - Kept as divs for flexibility */}
                <div className="submission-meta-group">
                    <p style={{ color: 'black' }}><strong>Form:</strong> {submission.form_name}</p>
                    <p style={{ color: 'black' }}><strong>Submitted:</strong> {formatDateTime(submission.submission_date)}</p>
                    <p style={{ color: 'black' }}><strong>Client ID:</strong> {submission.client_identifier || 'Not Provided'}</p>
                    <p style={{ color: 'black' }}><strong>Admin Notified: </strong>
                        <span className={`status-badge ${submission.is_notified ? 'status-success' : 'status-pending'}`}>
                            {submission.is_notified ? 'Yes' : 'No'}
                        </span>
                    </p>
                </div>

                {/* 🌟 START: Structured Table for Form Data 🌟 */}
                <h2 className="section-title">Submitted Form Data</h2>

                {Object.entries(submission.submission_data).length > 0 ? (
                    // Add a class 'submission-table' for styling in admin.css
                    <table className="submission-table">
                        <thead>
                        <tr>
                            <th>Field Name</th>
                            <th>Submitted Value</th>
                        </tr>
                        </thead>
                        <tbody>
                        {Object.entries(submission.submission_data).map(([key, value]) => (
                            <tr key={key}>
                                <td>{formatFieldName(key)}</td>
                                <td>{value}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No standard form data recorded.</p>
                )}
                {/* 🌟 END: Structured Table for Form Data 🌟 */}

                <h2 className="section-title">File Attachments</h2>

                {submission.attachments.length > 0 ? (
                    // We reuse the 'submission-table' class for consistent styling
                    <table className="submission-table file-attachments-table">
                        <thead>
                        <tr>
                            <th>Field Name</th>
                            <th>File Name / Uploaded Date</th>
                            <th style={{ width: '150px', textAlign: 'center' }}>Action</th>
                        </tr>
                        </thead>
                        <tbody>
                        {submission.attachments.map(file => {
                            // Extract just the file name from the URL for a cleaner display
                            // The URL structure is likely: /media/form_uploads/filename.jpg
                            const urlParts = file.file_url.split('/');
                            const fileName = urlParts[urlParts.length - 1];

                            return (
                                <tr key={file.file_url}>
                                    <td>{formatFieldName(file.field_name)}</td>
                                    <td>
                                        <p style={{ margin: 0, fontWeight: 'bold' }}>{fileName}</p>
                                        <span style={{ fontSize: '0.9em', color: '#777' }}>
                                    Uploaded: {formatDateTime(file.uploaded_at)}
                                </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <a
                                            href={file.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-secondary btn-sm"
                                            // Note: Changed to btn-secondary for visual contrast with btn-primary table header
                                        >
                                            Download
                                        </a>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                ) : (
                    <p style={{ color: 'orange' }}>No files were attached to this submission.</p>
                )}

            </div>
        </AdminAppLayout>

    );
};

export default AdminSubmissionDetail;