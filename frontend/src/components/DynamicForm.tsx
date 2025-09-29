import React, { useState, useEffect } from 'react';
import axios from 'axios';
import type {FormSchema, FormField, FormData} from '../types';


const DYNAMIC_SLUG_PLACEHOLDER=  'client-onboarding';

interface DynamicFormProps {
    formSlug: string;
}

const DynamicForm: React.FC<DynamicFormProps> = ({ formSlug }) => {

    const slugToUse = formSlug || DYNAMIC_SLUG_PLACEHOLDER;

    const [schema, setSchema] = useState<FormSchema | null>(null)
    const [formData, setFormData] = useState<FormData>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});


    // =======================================================================
    // 1. FETCHING DATA
    // =======================================================================

    useEffect(() => {

        if (!slugToUse) {
            setError("No Form slug provided");
            setIsLoading(false);
            return;
        }

        const fetchSchema = async () => {

            try {

                const response = await axios.get(`/api/admin/forms/${slugToUse}/`)
                setSchema(response.data);
                setIsLoading(false);
            }
            catch (err) {

                console.error(`Error fetching form schema for ${slugToUse}:`, err);
                setError("Failed to load form definition. Check if the Django server is running and the slug is correct.");
                setIsLoading(false);
            }
        };

        fetchSchema();

    }, [slugToUse]); //Dependency to ensure fefetching on url change


    // =======================================================================
    // 2. INPUT HANDLERS
    // =======================================================================

    const clearFieldError = (name: string) => {
        // CLEARS: Error for the specific field when the user starts typing
        setFieldErrors((prev: FieldErrors) => {
            const newState = { ...prev };
            delete newState[name];
            return newState;
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {

        const {name, value} = e.target;
        setFormData(prev => ({...prev, [name]: value}));
        clearFieldError(name); // CLEARS
    };


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {

        const name = e.target.name;
        const file = e.target.files ? e.target.files[0] : null;

        if (file) setFormData(prev => ({ ...prev, [name]: file}))
        else {
            setFormData(prev => {

                const newState = { ...prev};
                delete newState[name];
                return newState;
            });
        }
        clearFieldError(name); // CLEARS
    };


    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {

        const {name, checked} = e.target;
        setFormData(prev => ({...prev, [name]: checked}));
        clearFieldError(name); // CLEARS
    };



    // =======================================================================
    // 3. SUBMISSION LOGIC
    // =======================================================================

    const handleSubmit = async (e: React.FormEvent) => {

        e.preventDefault();
        setSubmissionMessage(null);
        setError(null);
        setFieldErrors({});

        if (!schema) return;

        const submissionData = new FormData();
        submissionData.append('formSlug', slugToUse);

        const submissionJSON: {[key: string]: string | number | boolean} = {};

        for (const field of schema.fields) {

            const value = formData[field.field_name];

            if (field.field_type == 'file_upload' && value instanceof File) submissionData.append(field.field_name, value)
            else if (value !== undefined) submissionJSON[field.field_name] = value as string | number | boolean;
        }

        const CLIENT_ID = 'user-session-kyc-client-123';
        submissionJSON['clientIdentifier'] = CLIENT_ID;

        submissionData.append('submissionData', JSON.stringify(submissionJSON));

        try {

            const response = await axios.post('/api/submit/', submissionData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setSubmissionMessage(`Submission successful! ID: ${response.data.submissionId}. Admin notified.`);
            setFormData({}); // Form cleared here
        }
        catch (err: any) {

            console.error("Submission error: ", err.response);

            if (err.response && err.response.data) {
                const errorData = err.response.data;

                // Check for DRF validation errors (object where keys are field names)
                if (typeof errorData === 'object' && !Array.isArray(errorData)) {
                    setFieldErrors(errorData as FieldErrors);
                    // Check for non-field errors (e.g., if Django returns 'non_field_errors')
                    if (errorData.non_field_errors) {
                        setError(`Submission failed: ${errorData.non_field_errors.join(' ')}`);
                    } else {
                        // Display a generic failure message alongside the field errors
                        setError("Submission failed due to invalid input(s) below.");
                    }
                } else {
                    // Fallback for unexpected error structures (e.g., 500 server error messages)
                    setError(`An unknown error occurred during submission: ${JSON.stringify(errorData)}`);
                }
            }
            else setError("An unknown error occurred during submission");
        }
    };


    // =======================================================================
    // 4. RENDERING LOGIC
    // =======================================================================

    const renderField = (field: FormField) => {

        const commonProps = {
            id: field.field_name,
            name: field.field_name,
            required: field.is_required,
        };

        const wrapperClass = field.field_type === 'checkbox' ? 'form-check mb-3' : 'form-group mb-3';
        const currentValue = formData[field.field_name] || '';
        const fieldError = fieldErrors[field.field_name];
        const isInvalid = !!fieldError;


        // --- Standard Inputs (Text, Number, Date, Email) ---
        if (['text', 'number', 'email', 'date'].includes(field.field_type)) {

            return (

                <div className={wrapperClass} key={field.field_name}>

                    <label htmlFor={field.field_name} className="form-label">
                        {field.label} {field.is_required && <span className="text-danger">*</span>}
                    </label>

                    <input
                        {...commonProps}
                        className={`form-control ${isInvalid ? 'is-invalid' : ''}`} // ADDED: Conditional class
                        type={field.field_type}
                        value={currentValue as string | number}
                        onChange={handleInputChange}
                        placeholder={field.field_type !== 'date' ? field.label : undefined}
                    />
                    {isInvalid && ( // ADDED: Error message display
                        <div className="invalid-feedback">
                            {fieldError.join(' ')}
                        </div>
                    )}
                </div>
            );
        }

        // --- Dropdown ---
        if (field.field_type === 'dropdown') {

            return (

                <div className="form-group mb-3" key={field.field_name}>

                    <label htmlFor={field.field_name} className="form-label">
                        {field.label} {field.is_required && <span className="text-danger">*</span>}
                    </label>

                    <select
                        {...commonProps}
                        className={`form-control ${isInvalid ? 'is-invalid' : ''}`}
                        value={currentValue as string}
                        onChange={handleInputChange}
                    >

                        <option value="">Select {field.label}</option>

                        {field.options && field.options.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    {isInvalid && ( // ADDED
                        <div className="invalid-feedback">
                            {fieldError.join(' ')}
                        </div>
                    )}
                </div>
            );
        }

        // --- File Upload ---
        if (field.field_type === 'file_upload') {

            return (

                <div className="form-group mb-3" key={field.field_name}>

                    <label htmlFor={field.field_name} className="form-label">
                        {field.label} {field.is_required && <span className="text-danger">*</span>}
                    </label>

                    <input
                        {...commonProps}
                        className={`form-control ${isInvalid ? 'is-invalid' : ''}`} // ADDED
                        type="file"
                        onChange={handleFileChange}
                        value={''}
                    />

                    {currentValue instanceof File && <small className="form-text text-muted">File ready: {(currentValue as File).name}</small>}
                    {isInvalid && ( // ADDED
                        <div className="invalid-feedback">
                            {fieldError.join(' ')}
                        </div>
                    )}
                </div>
            );
        }

        // --- Checkbox ---
        if (field.field_type === 'checkbox') {

            return (

                <div className="form-check mb-3" key={field.field_name}>

                    <input
                        {...commonProps}
                        className={`form-check-input ${isInvalid ? 'is-invalid' : ''}`} // ADDED
                        type="checkbox"
                        checked={!!currentValue}
                        onChange={handleCheckboxChange}
                    />

                    <label htmlFor={field.field_name} className="form-check-label">
                        {field.label} {field.is_required && <span className="text-danger">*</span>}
                    </label>
                    {isInvalid && ( // ADDED: Use d-block to ensure the error message is visible
                        <div className="invalid-feedback d-block">
                            {fieldError.join(' ')}
                        </div>
                    )}
                </div>
            );
        }

        return null;
    };


    // =======================================================================
    // 5. MAIN RENDER (No changes needed here)
    // =======================================================================

    if (isLoading) return <div className="loading">Loading form...</div>;
    if (error && !schema) return <div className="error alert alert-danger">{error}</div>;
    if (!schema) return <div className="error alert alert-warning">Form "{slugToUse}" not found.</div>;

    return (

        <div className="dynamic-form container mt-5">

            <h1>{schema.name}</h1>
            <p>{schema.description}</p>
            <hr />

            {submissionMessage && <div className="alert alert-success">{submissionMessage}</div>}
            {error && <div className="alert alert-danger">{error}</div>} {/* This shows generic or non-field errors */}

            <form onSubmit={handleSubmit} noValidate>
                {schema.fields.map(renderField)}

                <button
                    type="submit"
                    className="btn btn-primary mt-4"
                    disabled={!schema.fields.length}
                >
                    Submit Application
                </button>
            </form>
        </div>
    );

};

export default DynamicForm;