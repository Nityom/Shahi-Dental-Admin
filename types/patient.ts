export interface Patient {
    id: string;
    reference_number?: string;  // SDC## format reference number
    name: string;
    age: number;
    sex: string;
    phone_number: string;
    created_at?: string;
    updated_at?: string;
}