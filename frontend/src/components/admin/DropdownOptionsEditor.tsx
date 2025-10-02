import React from 'react';
import type {Option} from "../../types.ts";


interface Props {
    options: Option[];
    onChange: (options: Option[]) => void;
}

const DropdownOptionsEditor: React.FC<Props> = ({ options, onChange }) => {

    const handleOptionChange = (index: number, key: 'label' | 'value', value: string) => {
        const newOptions = [...options];
        newOptions[index] = {
            ...newOptions[index],
            [key]: value,
        };
        onChange(newOptions);
    };

    const addOption = () => {
        onChange([...options, { label: '', value: '' }]);
    };

    const removeOption = (index: number) => {
        const newOptions = options.filter((_, i) => i !== index);
        onChange(newOptions);
    };

    return (
        <div className="options-editor-container" style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '10px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '1em' }}>Dropdown Options:</h4>

            {options.map((option, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>

                    <input
                        type="text"
                        placeholder="Label (e.g., Employed)"
                        value={option.label}
                        onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                        style={{ flex: 1, padding: '5px' }}
                    />

                    <input
                        type="text"
                        placeholder="Value (e.g., employed)"
                        value={option.value}
                        onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                        style={{ flex: 1, padding: '5px' }}
                    />

                    <button type="button" onClick={() => removeOption(index)} style={{ padding: '5px 10px', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none' }}>
                        &times;
                    </button>
                </div>
            ))}

            <button type="button" onClick={addOption} style={{ padding: '8px 15px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
                + Add Option
            </button>
        </div>
    );
};

export default DropdownOptionsEditor;