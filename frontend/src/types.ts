/** Defining the structure for fields in the form schema*/

export interface FormField {
    id: number;
    field_type: 'text' | 'number' | 'email' | 'date' | 'dropdown' | 'checkbox' | 'file_upload';
    field_name: string;
    label: string;
    is_required: boolean;
    order: number; // Added 'order' since it's in the payload

    configuration: {
        // This structure is now used specifically for 'dropdown' options
        options?: {
            value: string;
            label: string
        }[];
        // Other potential settings (min/max for number, file extensions, etc.)
        // would also go here.
        [key: string]: any; // Allows for flexibility with other config data
    };
}

/** Form schema response structure*/
export interface FormSchema {
    id: number;
    name: string;
    slug: string;
    description: string;
    fields: FormField[];
}

/** Actual data fromt the client form */

export interface FormData {
    [key: string]: string | number | boolean | File;
}



export interface Option {
    value: string;
    label: string;
}

export interface AdminFieldConfig {
    // Basic field data
    id?: number; // Optional for new fields
    field_name: string;
    field_type: 'text' | 'number' | 'date' | 'dropdown' | 'checkbox' | 'file_upload';
    label: string;
    is_required: boolean;
    order: number;

    // Nested configuration object
    configuration: {
        options?: Option[]; // Used for 'dropdown'
        // Add other properties here later (e.g., min/max for number)
    };
}


/**
 * The top-level interface representing the entire form template
 * used in the AdminFormBuilder. This mirrors the structure
 * expected by the Django FormSerializer POST/PUT endpoint.
 */
export interface AdminFormConfig {
    id?: number; // Present only when editing an existing form
    name: string;
    slug: string;
    is_active: boolean;
    fields: AdminFieldConfig[]; // The list of individual fields
}