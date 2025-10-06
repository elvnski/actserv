import React, {useState, useEffect, JSX} from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import type { FormSchema, FormField } from '../../types.ts';
import './admin.css';
import { useAdminAuth } from './context/AdminAuthContext.tsx';
import { Link } from 'react-router-dom';
import AdminAppLayout from './AdminAppLayout.tsx';


const ADMIN_API_URL = 'http://127.0.0.1:8000/api/admin/forms/';

// Helper to create a new field with a unique temporary ID
const createNewField = (order: number): FormField => ({
    id: Math.random(), // Temporary client-side ID
    field_name: '',
    field_type: 'text',
    label: '',
    is_required: false,
    order: order,
    configuration: {},
});

const AdminFormBuilder = () => {
    // router hooks
    const { formId } = useParams<{ formId?: string }>();
    const navigate = useNavigate();

    // state
    const [formName, setFormName] = useState('');
    const [formSlug, setFormSlug] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [fields, setFields] = useState<FormField[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(!!formId);
    const [isActive, setIsActive] = useState(false);

    const { logout, isAuthReady } = useAdminAuth();


    // --- 2. Fetch Form Data for Editing ---
    useEffect(() => {

        if (!isAuthReady) {
            // Keep loading state true while waiting for context
            return;
        }

        if (formId) {
            setIsLoading(true);
            axios.get<FormSchema>(`${ADMIN_API_URL}${formId}/`)

                .then(response => {

                    setFormName(response.data.name);
                    setFormSlug(response.data.slug);
                    setFormDescription(response.data.description || '');
                    setIsActive(response.data.is_active);

                    // Ensure field IDs are numbers (for local state keys/mapping)
                    const loadedFields = response.data.fields.map(field => ({
                        ...field,
                        id: field.id || Math.random(),
                        configuration: field.configuration || {}
                    }));
                    setFields(loadedFields);
                })
                .catch(err => {
                    console.error("Failed to fetch form:", err);
                    setError("Failed to load form for editing. Check API connection.");
                })
                .finally(() => setIsLoading(false));
        }
    }, [formId, isAuthReady]);


    // --- 3. Handlers ---

    // Handle updates to the form's meta-data (name, slug, description)
    const handleFormMetaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'name') setFormName(value);
        if (name === 'slug') setFormSlug(value);
        if (name === 'description') setFormDescription(value);
    };

    const handleActiveToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsActive(e.target.checked);
    };

    // Handle updates to individual field properties (label, type, required)
    const handleFieldChange = (index: number, name: keyof FormField, value: any) => {
        setFields(prevFields => prevFields.map((field, i) => {
            if (i === index) {
                // If the type changes, reset configuration
                if (name === 'field_type') {
                    return { ...field, [name]: value, configuration: {} };
                }
                return { ...field, [name]: value };
            }
            return field;
        }));
    };

    // Handle updates to field configuration (e.g., dropdown options)
    const handleConfigurationChange = (index: number, config: FormFieldConfiguration) => {
        setFields(prevFields => prevFields.map((field, i) => {

            if (i === index) {

                return {
                    ...field,
                    configuration: {
                        ...field.configuration, // Keep existing configuration properties
                        ...config              // Overwrite or add new properties from the update
                    }
                };
            }
            return field;
        }));
    };

    // Add a new field
    const handleAddField = () => {
        const newOrder = fields.length ? fields[fields.length - 1].order + 1 : 1;
        setFields([...fields, createNewField(newOrder)]);
    };

    // Remove a field
    const handleRemoveField = (index: number) => {
        setFields(prevFields => prevFields.filter((_, i) => i !== index));
    };

    // Move a field up/down
    const handleMoveField = (index: number, direction: 'up' | 'down') => {
        setFields(prevFields => {
            const newFields = [...prevFields];
            const newIndex = direction === 'up' ? index - 1 : index + 1;

            if (newIndex >= 0 && newIndex < newFields.length) {
                // Swap the fields
                [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];

                // Re-sort the order property after swapping
                newFields.forEach((field, i) => field.order = i + 1);
            }
            return newFields;
        });
    };

    // --- 4. Submission Handler ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Validation (basic checks)
        if (!formName || !formSlug || fields.length === 0) {
            setError("Name, Slug, and at least one field are required.");
            setIsLoading(false);
            return;
        }

        // Checks for duplicate field names and labels
        const fieldNames = new Set<string>();
        const fieldLabels = new Set<string>();

        for (const field of fields) {
            const name = field.field_name.trim();
            const label = field.label.trim();

            if (!name) {
                setError(`Field names are required for all fields.`);
                setIsLoading(false);
                return;
            }

            if (fieldNames.has(name)) {
                setError(`Duplicate field name detected: "${name}". Field names must be unique.`);
                setIsLoading(false);
                return;
            }
            if (fieldLabels.has(label)) {
                setError(`Duplicate field label detected: "${label}". Field labels must be unique.`);
                setIsLoading(false);
                return;
            }

            fieldNames.add(name);
            fieldLabels.add(label);
        }


        // --- NEW: Check for duplicate Dropdown Options (Labels and Values) ---
        for (const field of fields) {
            if (field.field_type === 'dropdown') {
                const options = (field.configuration?.options || []) as { value: string; label: string }[];
                const optionValues = new Set<string>();
                const optionLabels = new Set<string>();

                for (const option of options) {
                    const value = option.value.trim();
                    const label = option.label.trim();

                    if (!value || !label) {
                        setError(`Dropdown field "${field.label}" has options with missing Value or Label.`);
                        setIsLoading(false);
                        return;
                    }

                    if (optionValues.has(value)) {
                        setError(`Dropdown field "${field.label}" has duplicate option value: "${value}".`);
                        setIsLoading(false);
                        return;
                    }
                    if (optionLabels.has(label)) {
                        setError(`Dropdown field "${field.label}" has duplicate option label: "${label}".`);
                        setIsLoading(false);
                        return;
                    }

                    optionValues.add(value);
                    optionLabels.add(label);
                }
            }
        }


        const data: Omit<FormSchema, 'id'> = {
            name: formName,
            slug: formSlug,
            description: formDescription,
            is_active: isActive, // Always set active upon creation/update
            fields: fields.map((field) => {
                const isNewField = typeof field.id === 'number' && field.id < 1;

                // If it's a new field, set the ID to null (as previously decided)
                if (isNewField) {
                    return { ...field, id: null };
                }

                // If it's an existing field, return it as is (including its configuration object)
                return field;

            }) as FormField[],
        };

        try {
            if (isEditMode && formId) {
                // PUT request for editing
                await axios.put(`${ADMIN_API_URL}${formId}/`, data);

                alert(`Form '${formName}' updated successfully!`);
                navigate('/admin/forms');

            } else {
                // POST request for creation
                const response = await axios.post(ADMIN_API_URL, data);
                alert(`Form '${formName}' created successfully!`);

                navigate('/admin/forms');
            }
        } catch (err: any) {
            console.error("Submission error:", err.response?.data || err);
            setError(`Failed to save form: ${err.response?.data?.slug || err.message}`);
        } finally {
            setIsLoading(false);
        }
    };


    // --- 5. Field Renderer (Dropdown Options Editor) ---
    const renderConfigEditor = (field: FormField, index: number) => {

        const configElements: JSX.Element[] = [];
        const currentConfig = field.configuration || {}; // Get the current configuration safely

        // --- Dropdown Options Editor ---
        if (field.field_type === 'dropdown') {
            const options = (currentConfig.options || []) as { value: string; label: string }[];

            const handleOptionChange = (optIndex: number, key: 'label' | 'value', value: string) => {
                const newOptions = options.map((opt, i) => {
                    if (i === optIndex) return { ...opt, [key]: value };
                    return opt;
                });

                handleConfigurationChange(index, { options: newOptions });
            };

            const handleAddOption = () => {
                const newOptions = [...options, { label: '', value: '' }];

                handleConfigurationChange(index, { options: newOptions });
            };

            const handleRemoveOption = (optIndex: number) => {
                const newOptions = options.filter((_, i) => i !== optIndex);

                handleConfigurationChange(index, { options: newOptions });
            };

            configElements.push(
                <div key="dropdown" className="field-config-editor">
                    <h5 className="config-title">Dropdown Options:</h5>
                    {options.map((option, optIndex) => (
                        <div key={optIndex} className="config-option-row">
                            <input
                                type="text"
                                value={option.label}
                                onChange={(e) => handleOptionChange(optIndex, 'label', e.target.value)}
                                placeholder="Label (e.g., Yes)"
                                className="form-input config-input"
                            />
                            <input
                                type="text"
                                value={option.value}
                                onChange={(e) => handleOptionChange(optIndex, 'value', e.target.value)}
                                placeholder="Value (e.g., Y)"
                                className="form-input config-input"
                            />
                            <button
                                type="button"
                                onClick={() => handleRemoveOption(optIndex)}
                                className="btn-danger btn-remove-option"
                            >
                                X
                            </button>
                        </div>
                    ))}
                    <button type="button" onClick={handleAddOption} className="btn-secondary">
                        + Add Option
                    </button>
                </div>
            );
        }


        // --- Conditional Dependency Editor ---
        const isConditionalCandidate = ['file_upload', 'text', 'number'].includes(field.field_type);
        const dependency = currentConfig.dependency || {};
        // The dependency is considered "enabled" if the dependency object exists in the config.
        const dependencyEnabled = !!currentConfig.dependency;

        const handleDependencyToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.checked) {
                // Enable: Pass the entire new dependency object
                handleConfigurationChange(index, {
                    dependency: { target_field: '', condition: '>', value: 0, action: 'is_required' }
                });
            } else {
                // Disable: Pass 'dependency: undefined' to effectively remove the dependency key from the config object
                handleConfigurationChange(index, { dependency: undefined });
            }
        };

        const handleDependencyChange = (key: keyof typeof dependency, val: any) => {
            // Pass the updated dependency object
            handleConfigurationChange(index, {
                dependency: { ...dependency, [key]: val }
            });
        };

        if (isConditionalCandidate) {
            configElements.push(
                <div key="dependency" className="field-config-editor dependency-editor">
                    <h5 className="config-title">Conditional Requirement:</h5>

                    <div className="form-group-builder is-required-check" style={{ marginBottom: '10px' }}>
                        <label className="form-label">Enable Conditional Rule:</label>
                        <input
                            type="checkbox"
                            checked={dependencyEnabled}
                            onChange={handleDependencyToggle}
                            className="form-checkbox"
                        />
                    </div>

                    {dependencyEnabled && (
                        <div className="dependency-rule-row">
                            <span>Required IF </span>

                            {/* Target Field Name */}
                            <input
                                type="text"
                                placeholder="Target Field Name"
                                value={dependency.target_field || ''}
                                onChange={(e) => handleDependencyChange('target_field', e.target.value)}
                                className="form-input config-input"
                            />

                            {/* Condition Operator */}
                            <select
                                value={dependency.condition || ''}
                                onChange={(e) => handleDependencyChange('condition', e.target.value)}
                                className="form-select config-input"
                            >
                                <option value=">"> Greater than  </option>
                                <option value="<"> Less than  </option>
                                <option value="=="> Equal to </option>
                                <option value="!="> Not equal to </option>
                                <option value="has_value"> Has Value </option>
                            </select>

                            {/* Required Value */}
                            <input
                                type="text"
                                placeholder="Value (e.g., 50000)"
                                value={dependency.value || ''}
                                onChange={(e) => handleDependencyChange('value', e.target.value)}
                                className="form-input config-input"
                                // Disable value input if the condition is just 'has_value'
                                disabled={dependency.condition === 'has_value'}
                            />
                            {/* Hidden field for action */}
                            <input type="hidden" value={dependency.action || 'is_required'} />
                        </div>
                    )}
                </div>
            );
        }

        return configElements.length > 0 ? <>{configElements}</> : null;
    };


    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    // Define navigation links for this specific page
    const navLinks = {
        toLanding: { to: '/onboarding.html', text: 'Go to Landing Page', href: true},
        toSubmissions: { to: '/admin/submissions', text: 'Go to Submissions Page' },
    };


    // --- 6. Main Render ---
    return (

        <AdminAppLayout
            pageTitle={isEditMode ? `Edit Form: ${formName}` : 'Create New Form Template'}
            pageSubtitle={isEditMode ? `Editing: '${formName}' Template` : 'Create New Template'}
            navLink1={navLinks.toLanding}
            navLink2={navLinks.toSubmissions}
            actionButton={{
                text: 'Log Out',
                onClick: handleLogout
            }}
        >

            <form onSubmit={handleSubmit} className="admin-container">


                {error && <div className="alert-danger" style={{ marginBottom: '20px', padding: '10px' }}>{error}</div>}

                <div className="form-meta-group">
                    <div className="form-group-builder">
                        <label className="form-label">Name:</label>
                        <input
                            type="text"
                            name="name"
                            value={formName}
                            onChange={handleFormMetaChange}
                            className="form-input"
                            required
                        />
                    </div>
                    <div className="form-group-builder">
                        <label className="form-label">Slug (Client URL):</label>
                        <input
                            type="text"
                            name="slug"
                            value={formSlug}
                            onChange={handleFormMetaChange}
                            className="form-input"
                            required
                        />
                    </div>
                    <div className="form-group-builder">
                        <label className="form-label">Description (Optional):</label>
                        <textarea
                            name="description"
                            value={formDescription}
                            onChange={handleFormMetaChange}
                            className="form-input"
                            rows={3}
                        />
                    </div>

                    {isEditMode && (
                        <div className="form-group-builder is-active-check">
                            <label className="form-label">
                                {isActive ? 'Form is Active' : 'Form is Deactivated'}
                            </label>
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={handleActiveToggle}
                                className="form-checkbox"
                                title="Activate or Deactivate this form."
                            />
                        </div>
                    )}

                </div>

                {/* --- Field Builder Section --- */}
                <h2 className="section-title">Form Fields</h2>

                <div className="field-list-wrapper">
                    {fields.map((field, index) => (
                        <div key={field.id} className="field-card">
                            {/* Field Header/Actions */}
                            <div className="field-header">
                                <h3 className="field-title">{field.label || `Field ${index + 1}`}</h3>
                                <div className="field-actions">
                                    <button type="button" onClick={() => handleMoveField(index, 'up')} disabled={index === 0} className="btn-move">↑</button>
                                    <button type="button" onClick={() => handleMoveField(index, 'down')} disabled={index === fields.length - 1} className="btn-move">↓</button>
                                    <button type="button" onClick={() => handleRemoveField(index)} className="btn-danger btn-sm">Remove</button>
                                </div>
                            </div>

                            {/* Field Properties */}
                            <div className="field-properties-row">
                                <div className="form-group-builder property-group">
                                    <label className="form-label">Label:</label>
                                    <input
                                        type="text"
                                        value={field.label}
                                        onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group-builder property-group">
                                    <label className="form-label">Type:</label>
                                    <select
                                        value={field.field_type}
                                        onChange={(e) => handleFieldChange(index, 'field_type', e.target.value as FormField['field_type'])}
                                        className="form-select"
                                    >
                                        {['text', 'number', 'email', 'date', 'dropdown', 'file_upload', 'checkbox'].map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group-builder property-group is-required-check">
                                    <label className="form-label">Required:</label>
                                    <input
                                        type="checkbox"
                                        checked={field.is_required}
                                        onChange={(e) => handleFieldChange(index, 'is_required', e.target.checked)}
                                        className="form-checkbox"
                                    />
                                </div>
                                <div className="form-group-builder property-group">
                                    <label className="form-label">Field Name (Key):</label>
                                    <input
                                        type="text"
                                        value={field.field_name}
                                        onChange={(e) => handleFieldChange(index, 'field_name', e.target.value)}
                                        className="form-input"
                                        placeholder="client_name"
                                    />
                                </div>
                            </div>

                            {/* Field Configuration (Dropdown Options, etc.) */}
                            {renderConfigEditor(field, index)}
                        </div>
                    ))}
                </div>

                <button type="button" onClick={handleAddField} className="btn-secondary btn-add-field">
                    + Add New Field
                </button>

                <div style={{ marginTop: '25px', textAlign: 'center' }}>
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Saving...' : 'Save Form Template'}
                    </button>
                </div>
            </form>
        </AdminAppLayout>

    );
};

export default AdminFormBuilder;