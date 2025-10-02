import React from 'react';
import type {AdminFieldConfig, Option} from '../../types.ts';
import DropdownOptionsEditor from './DropdownOptionsEditor';


interface Props {
    field: AdminFieldConfig;
    onFieldChange: (fieldName: string, updates: Partial<AdminFieldConfig>) => void;
}

const FieldConfiguration: React.FC<Props> = ({ field, onFieldChange }) => {

    const handleBasicChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        let updateValue: string | boolean = value;

        if (type === 'checkbox' && 'checked' in e.target) {
            updateValue = e.target.checked;
        }

        onFieldChange(field.field_name, {
            [name]: updateValue
        });
    };

    const handleDropdownOptionsChange = (options: Option[]) => {
        // Update the nested configuration property
        onFieldChange(field.field_name, {
            configuration: { ...field.configuration, options: options }
        });
    };

    const FieldTypes = [
        'text', 'number', 'date', 'dropdown', 'checkbox', 'file_upload'
    ];

    return (
        <div style={{ border: '2px solid #333', padding: '15px', margin: '15px 0', borderRadius: '8px', background: '#f8f8f8' }}>

            {/* --- Row 1: Type, Label, Name --- */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>

                {/* Field Type Select */}
                <label style={{ flex: 1 }}>
                    Type:
                    <select
                        name="field_type"
                        value={field.field_type}
                        onChange={handleBasicChange}
                        style={{ width: '100%', padding: '8px' }}
                    >
                        {FieldTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </label>

                {/* Human-readable Label */}
                <label style={{ flex: 2 }}>
                    Label (Display Text):
                    <input
                        type="text"
                        name="label"
                        value={field.label}
                        onChange={handleBasicChange}
                        style={{ width: '100%', padding: '8px' }}
                    />
                </label>

                {/* Data Key Name */}
                <label style={{ flex: 2 }}>
                    Name (API Key):
                    <input
                        type="text"
                        name="field_name"
                        value={field.field_name}
                        onChange={handleBasicChange}
                        style={{ width: '100%', padding: '8px' }}
                        // Note: You should add validation to ensure this is slug-cased/unique
                    />
                </label>
            </div>

            {/* --- Row 2: Basic Checkboxes --- */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '15px' }}>
                <label>
                    <input
                        type="checkbox"
                        name="is_required"
                        checked={field.is_required}
                        onChange={handleBasicChange}
                        style={{ marginRight: '5px' }}
                    />
                    Required Field
                </label>

                <label>Order: <input type="number" name="order" value={field.order} onChange={handleBasicChange} style={{ width: '60px' }} /></label>
            </div>

            {/* --- Conditional Configuration UI --- */}
            {field.field_type === 'dropdown' && (
                <DropdownOptionsEditor
                    options={field.configuration.options || []}
                    onChange={handleDropdownOptionsChange}
                />
            )}

            {/* Add logic for other types here later (e.g., file extension for file_upload) */}

        </div>
    );
};

export default FieldConfiguration;