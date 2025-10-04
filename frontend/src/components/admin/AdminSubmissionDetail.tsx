import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './admin.css';

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

    useEffect(() => {
        if (!submissionId) {
            setError("Submission ID missing.");
            setIsLoading(false);
            return;
        }

        axios.get<SubmissionDetail>(`${ADMIN_SUBMISSIONS_API_URL}${submissionId}/`)
            .then(response => {
                setSubmission(response.data);
            })
            .catch(err => {
                console.error("Failed to fetch submission detail:", err.response?.data || err);
                setError("Failed to load submission details. Check ID or authentication.");
            })
            .finally(() => setIsLoading(false));
    }, [submissionId]);

    if (isLoading) return <div className="admin-container">Loading submission details...</div>;
    if (error) return <div className="admin-container alert-danger">{error}</div>;
    if (!submission) return <div className="admin-container">Submission not found.</div>;

    const formatDateTime = (isoString: string) => {
        return isoString ? new Date(isoString).toLocaleString() : 'N/A';
    };

    return (
        <div className="admin-container">
            <header className="admin-header">
                <h1 className="admin-title">Submission Review: #{submission.id}</h1>
                <button onClick={() => navigate(-1)} className="btn-secondary"  style={{ marginLeft: '15px' }}>
                    ← Back to List
                </button>
            </header>

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

            <h2 className="section-title">Submitted Form Data</h2>
            <div className="submission-data-grid">
                {/* Render the compiled form data */}
                {Object.entries(submission.submission_data).length > 0 ? (
                    Object.entries(submission.submission_data).map(([key, value]) => (
                        <div key={key} className="data-item" style={{ color: 'black' }}>
                            <label className="data-label">{key.split('_').join(' ').toUpperCase()}: </label>
                            <span className="data-value">{value}</span>
                        </div>
                    ))
                ) : (
                    <p>No standard form data recorded.</p>
                )}
            </div>

            <h2 className="section-title">File Attachments</h2>
            <div className="file-attachment-list">
                {submission.attachments.length > 0 ? (
                    submission.attachments.map(file => (
                        <div key={file.file_url} className="file-item">
                            <span className="file-field-name" style={{ color: 'black' }}>Field: {file.field_name}</span>
                            <a
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary btn-sm"
                                // Add logic to handle the correct base URL if file_url is relative
                                // e.g., href={`${BASE_URL}${file.file_url}`}
                            >
                                Download File
                            </a>
                            <span className="file-upload-date">Uploaded: {formatDateTime(file.uploaded_at)}</span>
                        </div>
                    ))
                ) : (
                    <p  style={{ color: 'orange' }}>No files were attached to this submission.</p>
                )}
            </div>
        </div>
    );
};

export default AdminSubmissionDetail;