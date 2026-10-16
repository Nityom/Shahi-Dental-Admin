import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";
import { Patient } from "@/types/patient";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
}
const convex = new ConvexHttpClient(convexUrl);

const formatPatient = (p: any): Patient => ({
    ...p,
    id: p._id,
    age: Number(p.age),
});

export const createPatient = async (patient: Omit<Patient, 'id' | 'created_at' | 'updated_at' | 'reference_number'>) => {
    const data = await convex.mutation(api.patients.create, {
        name: patient.name,
        age: String(patient.age),
        sex: patient.sex as "Male" | "Female" | "Other",
        phone_number: patient.phone_number,
        address: (patient as any).address,
    });
    return data;
}

export const getPatientByPhoneNumber = async (phoneNumber: string): Promise<Patient | null> => {
    const data = await convex.query(api.patients.getByPhoneNumber, { phone_number: phoneNumber });
    return data ? formatPatient(data) : null;
}

export const getOrCreatePatient = async (patient: Omit<Patient, 'id' | 'created_at' | 'updated_at' | 'reference_number'>): Promise<Patient> => {
    const existingPatient = await getPatientByPhoneNumber(patient.phone_number);
    if (existingPatient) {
        return existingPatient;
    }

    const newPatientId = await createPatient(patient);
    const newPatient = await convex.query(api.patients.getById, { id: newPatientId });
    return formatPatient(newPatient!);
}

export const getPatients = async (): Promise<Patient[]> => {
    const data = await convex.query(api.patients.list);
    return data.map(formatPatient);
};

export const getPatientById = async (id: string): Promise<Patient | null> => {
    const data = await convex.query(api.patients.getById, { id: id as any });
    return data ? formatPatient(data) : null;
};

export const updatePatient = async (id: string, updates: Partial<Omit<Patient, 'id' | 'created_at' | 'updated_at'>>) => {
    const updateData: any = { id, ...updates };
    if (updates.age !== undefined) {
        updateData.age = String(updates.age);
    }
    const data = await convex.mutation(api.patients.update, updateData);
    return formatPatient(data);
};

export const deletePatient = async (id: string) => {
    // Temporary UI-generated IDs should not be sent to the database
    if (!id || id === 'undefined' || id === 'null' || id.toString().startsWith('TMP-')) {
        return true;
    }
    await convex.mutation(api.patients.remove, { id: id as any });
    return true;
};

export const searchPatients = async (searchTerm: string): Promise<Patient[]> => {
    if (!searchTerm) return [];
    const data = await convex.query(api.patients.search, { searchTerm });
    return data.map(formatPatient);
};

export const getPatientByReference = async (referenceNumber: string): Promise<Patient | null> => {
    const data = await convex.query(api.patients.getByReference, { reference_number: referenceNumber });
    return data ? formatPatient(data) : null;
};