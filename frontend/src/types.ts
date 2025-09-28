/** Defining the structure for fields in the form schema*/

export interface FormField {
    id: number;
    field_type: 'text' | 'number' | 'email' | 'date' | 'dropdown' | 'checkbox' | 'file_upload';
    field_name: string;
    label: string;
    is_required: boolean;
    // Added for dropdowns and checkboxes
    options?: {
        value: string;
        label: string
    }[];
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
