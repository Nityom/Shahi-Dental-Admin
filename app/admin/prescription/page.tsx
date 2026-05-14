'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getAllMedicines, deductMedicineStock } from '@/services/medicine';
import { Medicine } from '@/services/medicine';
import { addPrescription, Prescription, getPrescriptionById, updatePrescription } from '@/services/prescription';
import { getOrCreatePatient, getPatientByPhoneNumber, getPatientByReference } from '@/services/patients';
import { Patient } from '@/types/patient';
import { ToothData as TeethChartToothData } from '@/components/TeethChart';
import { getCurrentUser } from '@/services/adminuser';
import { createBill, Bill, getBillByPrescriptionId, updateBill } from '@/services/bills';
import { deductInventoryStock, recordInventorySale } from '@/services/inventory';
import { getEnabledConsumablesForDeduction } from '@/services/consumables';
import { ConvexHttpClient } from 'convex/browser';
// @ts-ignore
import { api } from '@/convex/_generated/api';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured.');
}
const convexClient = new ConvexHttpClient(convexUrl);

interface MedicineEntry {
  name: string;
  dosage: string;
  duration: string;
  quantity?: number; // Quantity to dispense
}

// Define dental disease options
const DENTAL_DISEASES = [
  "Dental Caries",
  "Gingivitis",
  "Periodontitis",
  "Pulpitis",
  "Dental Abscess",
  "Tooth Fracture",
  "Root Canal Infection",
  "Enamel Erosion",
  "Dental Hypersensitivity",
  "Malocclusion",
  "Impacted Tooth",
  "Dental Fluorosis",
  "Bruxism (Teeth Grinding)",
  "Temporomandibular Joint Disorder (TMJ)",
  "Oral Candidiasis",
  "Dental Plaque",
  "Dental Calculus",
  "Tooth Discoloration"
];

// Define quadrants
const DENTAL_QUADRANTS = [
  { id: 1, name: "Upper Right Quadrant" },
  { id: 2, name: "Upper Left Quadrant" },
  { id: 3, name: "Lower Left Quadrant" },
  { id: 4, name: "Lower Right Quadrant" }
];

// Define tooth numbers by quadrant with additional teeth
const TEETH_BY_QUADRANT = {
  1: [
    ...Array.from({ length: 8 }, (_, i) => ({ number: i + 1, name: `Tooth ${i + 1}` })),
    ...['A', 'B', 'C', 'D', 'E'].map((letter) => ({ number: letter, name: `Tooth ${letter}` }))
  ],
  2: [
    ...Array.from({ length: 8 }, (_, i) => ({ number: i + 1, name: `Tooth ${i + 1}` })),
    ...['A', 'B', 'C', 'D', 'E'].map((letter) => ({ number: letter, name: `Tooth ${letter}` }))
  ],
  3: [
    ...Array.from({ length: 8 }, (_, i) => ({ number: i + 1, name: `Tooth ${i + 1}` })),
    ...['A', 'B', 'C', 'D', 'E'].map((letter) => ({ number: letter, name: `Tooth ${letter}` }))
  ],
  4: [
    ...Array.from({ length: 8 }, (_, i) => ({ number: i + 1, name: `Tooth ${i + 1}` })),
    ...['A', 'B', 'C', 'D', 'E'].map((letter) => ({ number: letter, name: `Tooth ${letter}` }))
  ]
};

// Default dental procedures with prices (for Treatment Done section)
const DEFAULT_DENTAL_PROCEDURES = [
  { id: 1, name: 'Dental Checkup', price: 500 },
  { id: 2, name: 'Teeth Cleaning', price: 1000 },
  { id: 3, name: 'Root Canal', price: 5000 },
  { id: 4, name: 'Tooth Extraction', price: 1500 },
  { id: 5, name: 'Dental Filling', price: 1200 },
  { id: 6, name: 'Dental Crown', price: 8000 },
  { id: 7, name: 'Dental Bridge', price: 15000 },
  { id: 8, name: 'Dental Implant', price: 25000 },
  { id: 9, name: 'Teeth Whitening', price: 4000 },
  { id: 10, name: 'Braces Consultation', price: 1000 },
];

// Treatment plan item with catalog reference, cost, and optional notes
interface TreatmentPlanItem {
  name: string;
  cost: number;
  notes?: string;
}

// Treatment plan item with catalog reference, cost, and optional notes
interface TreatmentPlanItem {
  name: string;
  cost: number;
  notes?: string;
}

// Define ToothData interface to match the prescription service
interface ToothData {
  id: number;  // Changed to number only
  type: string;
  category: string;
  disease: string;
}

interface FormData {
  patientName: string;
  age: string;
  sex: string;
  phoneNumber: string;
  date: string;
  cc: string;
  mh: string;
  investigation: string;
  de: string;
  treatmentPlan: TreatmentPlanItem[];
  advice: string;
  followupDate: string;
  reference_number?: string;
}

interface TreatmentItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const PrescriptionPage = () => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [patientReferenceNumber, setPatientReferenceNumber] = useState<string | undefined>(undefined);

  const [formData, setFormData] = useState<FormData>({
    patientName: '',
    age: '',
    sex: '',
    phoneNumber: '',
    date: new Date().toISOString().slice(0, 10),
    cc: '',
    mh: '',
    investigation: '',
    de: '',
    treatmentPlan: [],
    advice: '',
    followupDate: '',
  });

  const [treatmentItems, setTreatmentItems] = useState<TreatmentItem[]>([]);
  const [newTreatmentStep, setNewTreatmentStep] = useState('');

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isStaffUser, setIsStaffUser] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();

        if (!user) {
          console.error('No user session found');
          return;
        }

        if (user.email) {
          setUserEmail(user.email);
          setIsStaffUser(user.email === 'staff@titanium.com');
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      }
    };

    checkAuth();
  }, []);

  const [medicines, setMedicines] = useState<MedicineEntry[]>([]);
  // New states for teeth selection
  const [selectedTeethNumbers, setSelectedTeethNumbers] = useState<string[]>([]);
  const [selectedDisease, setSelectedDisease] = useState<string>('');
  const [selectedTeeth, setSelectedTeeth] = useState<ToothData[]>([]);

  // State for oral examination notes
  const [oralExamNotes, setOralExamNotes] = useState<string>('');

  // States for managing disease and treatment lists
  const [dentalDiseases, setDentalDiseases] = useState<string[]>(DENTAL_DISEASES);
  const [newDiseaseName, setNewDiseaseName] = useState<string>('');
  const [showAddDiseaseForm, setShowAddDiseaseForm] = useState<boolean>(false);
  const [dentalProcedures, setDentalProcedures] = useState<{ id: number; name: string; price: number }[]>(DEFAULT_DENTAL_PROCEDURES);
  const [newTreatmentName, setNewTreatmentName] = useState<string>('');
  const [newTreatmentPrice, setNewTreatmentPrice] = useState<string>('');
  const [showAddTreatmentForm, setShowAddTreatmentForm] = useState<boolean>(false);

  const [medicineOptions, setMedicineOptions] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [currentBill, setCurrentBill] = useState<any>(null);
  const [paymentDetails, setPaymentDetails] = useState({
    amountPaid: 0,
    paymentMethod: 'Cash',
    discountPercent: 0,
  });

  // Doctor / signature selector
  const [selectedDoctor, setSelectedDoctor] = useState<'kautilya' | 'anjali'>('kautilya');

  // Consultation charge
  const [applyConsultationCharge, setApplyConsultationCharge] = useState<boolean>(true);
  const [consultationCharge, setConsultationCharge] = useState<number>(300);
  const [consultationDiscount, setConsultationDiscount] = useState<number>(0);

  // Treatment plan catalog search
  const [tpSearchQuery, setTpSearchQuery] = useState('');
  const [showTpDropdown, setShowTpDropdown] = useState(false);
  // Custom cost/notes for a pending plan-item addition
  const [tpPendingName, setTpPendingName] = useState('');
  const [tpPendingCost, setTpPendingCost] = useState<number>(0);
  const [tpPendingNotes, setTpPendingNotes] = useState('');

  // Track last loaded CC to detect changes and reset dependent fields
  const [prevLoadedCC, setPrevLoadedCC] = useState<string>('');

  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        const data = await getAllMedicines();
        setMedicineOptions(data);
      } catch (err) {
        console.error('Failed to fetch medicines:', err);
      }
    };

    fetchMedicines();

    // Cleanup function to revoke object URL when component unmounts
    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  useEffect(() => {
    // Reset the success message after 3 seconds
    if (saveSuccess) {
      const timer = setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  // When CC field loses focus and the value changed from what was prefilled,
  // clear all dependent clinical fields so the doctor starts fresh.
  const handleCCBlur = () => {
    if (prevLoadedCC && formData.cc.trim() !== prevLoadedCC.trim()) {
      setPrevLoadedCC('');
      setFormData(prevData => ({
        ...prevData,
        investigation: '',
        de: '',
        treatmentPlan: [],
      }));
      setOralExamNotes('');
      setSelectedTeeth([]);
      setTreatmentItems([]);
    }
  };

  // Handle phone number change with patient lookup
  const handlePhoneNumberChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const phoneNumber = e.target.value;

    setFormData(prevData => ({ ...prevData, phoneNumber: phoneNumber }));

    if (phoneNumber.length >= 10) {
      try {
        const existingPatient = await getPatientByPhoneNumber(phoneNumber);

        if (existingPatient) {
          setFormData(prevData => ({
            ...prevData,
            patientName: existingPatient.name,
            age: existingPatient.age?.toString() || '',
            sex: existingPatient.sex || '',
            phoneNumber: existingPatient.phone_number,
            reference_number: existingPatient.reference_number,
          }));
          setPatientReferenceNumber(existingPatient.reference_number);

          // Pre-fill clinical fields from the latest prescription
          try {
            const latestRx = await convexClient.query(api.prescriptions.getLatestByPhone, { phone_number: phoneNumber });
            if (latestRx) {
              const safeParse = (data: any, fallback: any = []) => {
                if (typeof data === 'string') { try { return JSON.parse(data); } catch { return fallback; } }
                return data || fallback;
              };
              const normTreatmentPlan = (raw: any): TreatmentPlanItem[] => {
                if (!Array.isArray(raw)) return [];
                return raw.map((item: any) => {
                  if (typeof item === 'string') return { name: item, cost: 0, notes: '' };
                  return { name: item.name || String(item), cost: item.cost || 0, notes: item.notes || '' };
                });
              };

              const loadedCC = latestRx.chief_complaint || '';
              setPrevLoadedCC(loadedCC);

              setFormData(prevData => ({
                ...prevData,
                cc: loadedCC,
                mh: latestRx.medical_history || '',
                investigation: latestRx.investigation || '',
                de: latestRx.diagnosis || '',
                treatmentPlan: normTreatmentPlan(safeParse(latestRx.treatment_plan)),
              }));

              if (latestRx.oral_exam_notes) setOralExamNotes(latestRx.oral_exam_notes);

              const teethRaw = safeParse(latestRx.selected_teeth);
              if (Array.isArray(teethRaw) && teethRaw.length > 0) {
                setSelectedTeeth(teethRaw.map((t: any) => ({
                  id: t.id, type: t.type || 'Permanent', category: t.category || '', disease: t.disease || '',
                })));
              }

              const medsRaw = safeParse(latestRx.medicines);
              if (Array.isArray(medsRaw) && medsRaw.length > 0) setMedicines(medsRaw);

              const doneRaw = safeParse(latestRx.treatment_done);
              if (Array.isArray(doneRaw) && doneRaw.length > 0) {
                setTreatmentItems(doneRaw.map((item: any) => ({
                  id: item.id || Math.random(),
                  description: item.description || '',
                  quantity: item.quantity || 1,
                  unitPrice: item.unit_price || item.unitPrice || 0,
                  total: item.total || 0,
                })));
              }
            }
          } catch (rxError) {
            console.error('Error fetching latest prescription for prefill:', rxError);
          }
        }
      } catch (error) {
        console.error('Error fetching patient by phone:', error);
      }
    }
  };

  // Helper function to parse dosage (e.g., "1-0-1" = 2 pills/day, "1-2-1" = 4 pills/day)
  const parseDosage = (dosage: string): number => {
    if (!dosage) return 0;

    // Try to match pattern like "1-0-1" or "1-2-1"
    const dosagePattern = dosage.match(/(\d+)-(\d+)-(\d+)/);
    if (dosagePattern) {
      const morning = parseInt(dosagePattern[1]) || 0;
      const afternoon = parseInt(dosagePattern[2]) || 0;
      const evening = parseInt(dosagePattern[3]) || 0;
      return morning + afternoon + evening;
    }

    // Try pattern like "1-1" (twice a day)
    const twicePattern = dosage.match(/(\d+)-(\d+)/);
    if (twicePattern) {
      const first = parseInt(twicePattern[1]) || 0;
      const second = parseInt(twicePattern[2]) || 0;
      return first + second;
    }

    // Try single number
    const singleNumber = dosage.match(/(\d+)/);
    if (singleNumber) {
      return parseInt(singleNumber[1]) || 0;
    }

    return 0;
  };

  // Helper function to parse duration (e.g., "3 days" = 3, "1 week" = 7, "2 weeks" = 14)
  const parseDuration = (duration: string): number => {
    if (!duration) return 0;

    const lowerDuration = duration.toLowerCase();

    // Match patterns like "3 days", "7 days"
    const daysPattern = lowerDuration.match(/(\d+)\s*(?:day|days)/);
    if (daysPattern) {
      return parseInt(daysPattern[1]) || 0;
    }

    // Match patterns like "1 week", "2 weeks"
    const weeksPattern = lowerDuration.match(/(\d+)\s*(?:week|weeks)/);
    if (weeksPattern) {
      return (parseInt(weeksPattern[1]) || 0) * 7;
    }

    // Match patterns like "1 month", "2 months"
    const monthsPattern = lowerDuration.match(/(\d+)\s*(?:month|months)/);
    if (monthsPattern) {
      return (parseInt(monthsPattern[1]) || 0) * 30;
    }

    // Try just a number (assume days)
    const numberOnly = lowerDuration.match(/(\d+)/);
    if (numberOnly) {
      return parseInt(numberOnly[1]) || 0;
    }

    return 0;
  };

  // Calculate quantity based on dosage and duration
  const calculateQuantity = (dosage: string, duration: string): number => {
    const pillsPerDay = parseDosage(dosage);
    const numberOfDays = parseDuration(duration);
    return pillsPerDay * numberOfDays;
  };

  const handleMedicineChange = (index: number, field: keyof MedicineEntry, value: string | number) => {
    setMedicines(prevMedicines => {
      const updatedMedicines = [...prevMedicines];
      updatedMedicines[index] = {
        ...updatedMedicines[index],
        [field]: value
      };

      // Auto-calculate quantity when dosage or duration changes
      if (field === 'dosage' || field === 'duration') {
        const medicine = updatedMedicines[index];
        const calculatedQty = calculateQuantity(
          field === 'dosage' ? String(value) : medicine.dosage,
          field === 'duration' ? String(value) : medicine.duration
        );
        if (calculatedQty > 0) {
          updatedMedicines[index].quantity = calculatedQty;
        }
      }

      return updatedMedicines;
    });
  };

  const addMedicine = () => {
    setMedicines([...medicines, { name: '', dosage: '', duration: '', quantity: 1 }]);
  };
  const removeMedicine = (index: number) => {
    const updatedMedicines = [...medicines];
    updatedMedicines.splice(index, 1);
    setMedicines(updatedMedicines);
  };

  // Handler for adding a tooth to the selected teeth list
  const handleAddTeeth = () => {
    if (selectedTeethNumbers?.length && selectedDisease) {
      const newTeeth = selectedTeethNumbers.map(toothId => {
        const quadrant = parseInt(toothId[0]);
        const number = parseInt(toothId.slice(1));
        const quadrantName = DENTAL_QUADRANTS.find(q => q.id === quadrant)?.name || '';

        return {
          id: parseInt(toothId),
          type: number >= 9 ? 'Permanent' : 'Deciduous',
          category: quadrantName,
          disease: selectedDisease
        };
      });

      setSelectedTeeth([...selectedTeeth, ...newTeeth]);
      setSelectedTeethNumbers([]);
      setSelectedDisease('');
    }
  };

  // Handler for removing a tooth from selection
  const handleRemoveTooth = (toothId: number) => {
    setSelectedTeeth(teeth => teeth.filter(tooth => tooth.id !== toothId));
  };

  // Handler for adding a new disease to the list
  const handleAddNewDisease = () => {
    if (newDiseaseName.trim() && !dentalDiseases.includes(newDiseaseName.trim())) {
      setDentalDiseases([...dentalDiseases, newDiseaseName.trim()]);
      setNewDiseaseName('');
      setShowAddDiseaseForm(false);
    }
  };

  // Handler for adding a new treatment to the list
  const handleAddNewTreatment = () => {
    if (newTreatmentName.trim() && newTreatmentPrice.trim()) {
      const price = parseFloat(newTreatmentPrice) || 0;
      const newId = Math.max(...dentalProcedures.map(p => p.id), 0) + 1;
      const newProcedure = {
        id: newId,
        name: newTreatmentName.trim(),
        price
      };
      setDentalProcedures([...dentalProcedures, newProcedure]);
      setNewTreatmentName('');
      setNewTreatmentPrice('');
      setShowAddTreatmentForm(false);
    }
  };

  // Handler for removing a disease from the list
  const handleRemoveDisease = (disease: string) => {
    setDentalDiseases(dentalDiseases.filter(d => d !== disease));
  };

  // Handler for removing a treatment from the list
  const handleRemoveTreatment = (treatmentId: number) => {
    setDentalProcedures(dentalProcedures.filter(t => t.id !== treatmentId));
  };


  // Add function to load prescription data
  const loadPrescriptionData = useCallback(async (id: string) => {
    try {

      const prescription = await getPrescriptionById(id);
      if (prescription) {


        // Helper to safely parse JSON strings that might come from the PHP migration
        const safeParse = (data: any, fallback: any = []) => {
          if (typeof data === 'string') {
            try {
              return JSON.parse(data);
            } catch (e) {
              return fallback;
            }
          }
          return data || fallback;
        };

        if (prescription.medicines) {
          const medicinesRaw = safeParse(prescription.medicines);
          if (Array.isArray(medicinesRaw) && medicinesRaw.length > 0) {
            setMedicines(medicinesRaw);
          }
        }

        if (prescription.selected_teeth) {
          const selectedTeethRaw = safeParse(prescription.selected_teeth);
          if (Array.isArray(selectedTeethRaw) && selectedTeethRaw.length > 0) {
            const mappedTeeth = selectedTeethRaw.map((tooth: any) => ({
              id: tooth.id,
              type: tooth.type || 'Permanent',
              category: tooth.category || '',
              disease: tooth.disease || ''
            }));
            setSelectedTeeth(mappedTeeth);
          }
        }

        if (prescription.treatment_done) {
          const treatmentDoneRaw = safeParse(prescription.treatment_done);
          if (Array.isArray(treatmentDoneRaw) && treatmentDoneRaw.length > 0) {
            const mappedItems = treatmentDoneRaw.map((item: any) => ({
              id: item.id || Math.random(),
              description: item.description || '',
              quantity: item.quantity || 1,
              unitPrice: item.unit_price || item.unitPrice || 0,
              total: item.total || 0
            }));
            setTreatmentItems(mappedItems);
          }
        }

        // Also ensure treatment plan is safely parsed in the main formData setting
        const treatmentPlanRaw = safeParse(prescription.treatment_plan);
        const normTreatmentPlan = (raw: any[]): TreatmentPlanItem[] =>
          raw.map((item: any) => {
            if (typeof item === 'string') return { name: item, cost: 0, notes: '' };
            return { name: item.name || String(item), cost: item.cost || 0, notes: item.notes || '' };
          });

        setFormData({
          patientName: prescription.patient_name || '',
          age: prescription.age ? prescription.age.toString() : '',
          sex: prescription.sex || '',
          phoneNumber: prescription.phone_number || '',
          date: prescription.prescription_date || '',
          cc: prescription.chief_complaint || '',
          mh: prescription.medical_history || '',
          investigation: prescription.investigation || '',
          de: prescription.diagnosis || '',
          treatmentPlan: Array.isArray(treatmentPlanRaw) ? normTreatmentPlan(treatmentPlanRaw) : [],
          advice: prescription.advice || '',
          followupDate: prescription.followup_date || '',
          reference_number: prescription.reference_number || ''
        });

        // Set reference number in separate state
        setPatientReferenceNumber(prescription.reference_number || '');

        if (prescription.oral_exam_notes) {
          setOralExamNotes(prescription.oral_exam_notes);
        }
      }
    } catch (error) {
      console.error('Error loading prescription:', error);
      alert('Failed to load prescription data');
    }
  }, []);

  // Modified function to save prescription to the database
  const savePrescriptionToDatabase = async () => {
    try {
      setSaving(true);

      // Prepare patient data
      const patientData: Omit<Patient, 'id' | 'created_at' | 'updated_at' | 'reference_number'> = {
        name: formData.patientName,
        age: parseInt(formData.age, 10),
        sex: formData.sex,
        phone_number: formData.phoneNumber
      };


      let patient;
      try {
        patient = await getOrCreatePatient(patientData);

      } catch (patientError) {
        console.error('Error in getOrCreatePatient:', patientError);
        throw new Error(`Failed to create patient: ${patientError instanceof Error ? patientError.message : 'Unknown error'}`);
      }

      if (!patient) {
        throw new Error('Patient creation returned null or undefined');
      }

      // Check if reference_number exists, if not try to fetch the patient again
      if (!patient.reference_number) {
        console.warn('Patient missing reference_number on first creation, attempting to fetch by phone...');
        try {
          const refetchedPatient = await getPatientByPhoneNumber(formData.phoneNumber);
          if (refetchedPatient && refetchedPatient.reference_number) {

            patient = refetchedPatient;
          } else {
            console.error('Patient still missing reference_number after refetch:', patient);
            throw new Error('Patient created but missing reference number. The database may not have saved correctly. Please try again or contact support.');
          }
        } catch (refetchError) {
          console.error('Error refetching patient:', refetchError);
          throw new Error('Patient created but reference number could not be retrieved. Please refresh the page and try again.');
        }
      }

      // Update form data with the patient's reference number
      setFormData(prev => ({
        ...prev,
        reference_number: patient.reference_number
      }));
      setPatientReferenceNumber(patient.reference_number);


      const prescriptionData: Prescription = {
        patient_name: formData.patientName,
        phone_number: formData.phoneNumber,
        age: formData.age,
        sex: formData.sex,
        reference_number: patient.reference_number,
        prescription_date: formData.date,
        chief_complaint: formData.cc,
        medical_history: formData.mh,
        investigation: formData.investigation,
        diagnosis: formData.de,
        treatment_plan: formData.treatmentPlan,
        oral_exam_notes: oralExamNotes,
        selected_teeth: selectedTeeth,
        medicines: medicines,
        treatment_done: treatmentItems.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total
        })),
        advice: formData.advice,
        followup_date: formData.followupDate || undefined,
        doctor_name: selectedDoctor === 'anjali' ? 'Dr. Anjali Swaroop' : 'Dr. Kautilya Swaroop',
      };

      let savedPrescription;
      if (isEditMode && prescriptionId && prescriptionId !== "undefined" && prescriptionId !== "null") {
        // Update existing prescription (images are handled separately in IndexedDB)
        savedPrescription = await updatePrescription(prescriptionId, prescriptionData);
      } else {
        // Create new prescription
        savedPrescription = await addPrescription(prescriptionData);
        if (savedPrescription?.id) {
          setPrescriptionId(savedPrescription.id);
          setIsEditMode(true);
        }
      }

      // Auto-record medicine sales when prescription is saved
      if (medicines.length > 0 && savedPrescription?.id && patient?.id) {
        try {

          const salePromises = medicines
            .filter(med => med.name && med.dosage)
            .map(async (med) => {
              try {
                // Find the medicine in medicineOptions to get the ID

                const medicineDetail = medicineOptions.find(m => m.name === med.name);
                if (!medicineDetail || !medicineDetail.id) {
                  console.error(`❌ Medicine "${med.name}" not found in inventory - cannot record sale`);
                  console.log('🔍 Available medicine names:', medicineOptions.map(m => m.name));
                  alert(`Warning: Medicine "${med.name}" not found in inventory. Sale not recorded.`);
                  return;
                }


                // Use the quantity field directly if available, otherwise parse from dosage
                const quantity = med.quantity && med.quantity > 0
                  ? med.quantity
                  : (() => {
                      const quantityMatch = med.dosage.toString().match(/[\d.]+/);
                      return quantityMatch ? parseFloat(quantityMatch[0]) : 1;
                    })();


                if (quantity <= 0 || isNaN(quantity)) {
                  console.error(`❌ Invalid quantity for ${med.name}: ${med.dosage}`);
                  alert(`Warning: Invalid quantity for "${med.name}". Sale not recorded.`);
                  return;
                }


                const results = await deductMedicineStock([{ name: medicineDetail.name, quantity: quantity }]);
                const result = results[0];

                if (result.status === 'success') {
                  console.log(`✅ Sale recorded successfully for ${med.name}:`, result);
                } else if (result.status === 'warning') {
                  alert(`⚠️ Insufficient stock for "${med.name}": ${result.message}`);
                } else {
                  console.error(`❌ Failed to record sale for ${med.name}:`, result);
                  alert(`❌ Failed to record sale for "${med.name}": ${result.message}`);
                }
              } catch (error) {
                console.error(`❌ Error recording sale for ${med.name}:`, error);
                alert(`Error recording sale for "${med.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
                // Continue with other medicines even if one fails
              }
            });

          const results = await Promise.allSettled(salePromises);
          const successCount = results.filter(r => r.status === 'fulfilled').length;
          const failCount = results.filter(r => r.status === 'rejected').length;
          // console.log(`✅ Medicine sales recording completed: ${successCount} successful, ${failCount} failed`);

          // if (successCount > 0) {
          //   alert(`✅ ${successCount} medicine sale(s) recorded successfully!`);
          // }
        } catch (salesError) {
          console.error('Error during medicine sales recording:', salesError);
          // Don't throw error - prescription is saved, sales recording is secondary
        }
      }

      // Auto-deduct consumable items from inventory for each patient
      // Only deduct for new prescriptions, not when editing existing ones
      if (!isEditMode && savedPrescription?.id) {
        try {
          // Get consumable items from database (managed via Consumable Settings page)
          const consumableItems = await getEnabledConsumablesForDeduction();

          if (consumableItems.length === 0) {
            console.log('⚠️ No consumable items configured. Please add items in Consumable Settings.');
          } else {
            console.log('📦 Deducting consumable items from inventory...');
            const deductionResults = await deductInventoryStock(consumableItems);

            // Log results
            deductionResults.forEach(result => {
              if (result.status === 'success') {
                console.log(`✅ ${result.name}: ${result.message}`);
              } else if (result.status === 'warning') {
                console.warn(`⚠️ ${result.name}: ${result.message}`);
              } else {
                console.error(`❌ ${result.name}: ${result.message}`);
              }
            });

            // Record consumable usage to inventory_sales for reporting
            try {
              console.log('📊 Recording consumable usage to sales...');
              const today = new Date().toISOString().split('T')[0];
              const usagePromises = consumableItems.map(async (item) => {
                const result = deductionResults.find(r => r.name === item.name && r.status === 'success');
                if (result) {
                  try {
                    const itemRate = (result as any).rate || 0;
                    await recordInventorySale({
                      inventory_name: item.name,
                      quantity: item.quantity,
                      rate: itemRate,
                      total_amount: itemRate * item.quantity,
                      sale_date: today,
                      notes: `Auto-deducted for prescription - ${formData.patientName}`,
                    });
                    console.log(`✅ Recorded sale for ${item.name}`);
                  } catch (error) {
                    console.error(`❌ Failed to record sale for ${item.name}:`, error);
                  }
                }
              });
              await Promise.allSettled(usagePromises);
              console.log('✅ Consumable usage recording completed');
            } catch (usageError) {
              console.error('Error recording consumable usage:', usageError);
              // Don't throw error - deduction is done, tracking is secondary
            }

            // Check if any items had warnings or errors
            const warnings = deductionResults.filter(r => r.status === 'warning');
            const errors = deductionResults.filter(r => r.status === 'error');

            if (warnings.length > 0 || errors.length > 0) {
              const warningMsg = warnings.map(w => `${w.name}: ${w.message}`).join('\n');
              const errorMsg = errors.map(e => `${e.name}: ${e.message}`).join('\n');
              const combinedMsg = [
                warnings.length > 0 ? `⚠️ Low Stock Warnings:\n${warningMsg}` : '',
                errors.length > 0 ? `❌ Errors:\n${errorMsg}` : ''
              ].filter(m => m).join('\n\n');

              if (combinedMsg) {
                alert(`Prescription saved, but inventory issues detected:\n\n${combinedMsg}\n\nPlease restock these items.`);
              }
            }
          }
        } catch (consumableError) {
          console.error('Error deducting consumable items:', consumableError);
          // Don't throw error - prescription is saved, consumable deduction is secondary
          alert('Prescription saved successfully, but failed to deduct some consumable items from inventory. Please check inventory manually.');
        }
      }

      // Always ensure a bill exists for the prescription
      if (savedPrescription?.id && patient?.id) {
        try {
          const consultationFee = applyConsultationCharge
            ? Math.round(consultationCharge * (1 - consultationDiscount / 100) * 100) / 100
            : 0;

          // Treatment Done items
          const treatmentDoneItems = treatmentItems.map((item, index) => ({
            id: index + 2,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total: item.unitPrice * item.quantity,
            item_type: 'procedure' as const
          }));

          // Treatment Plan items (with cost) — included only if not already covered by Treatment Done
          const treatmentDoneNames = new Set(treatmentItems.map(i => i.description.toLowerCase()));
          const treatmentPlanBillItems = formData.treatmentPlan
            .filter(tp => tp.cost > 0 && !treatmentDoneNames.has(tp.name.toLowerCase()))
            .map((tp, index) => ({
              id: treatmentItems.length + index + 2,
              description: tp.name + (tp.notes ? ` (${tp.notes})` : ''),
              quantity: 1,
              unit_price: tp.cost,
              total: tp.cost,
              item_type: 'procedure' as const
            }));

          // Medicine items
          const medicineItems = medicines
            .filter(med => med.name && med.quantity && med.quantity > 0)
            .map((med, index) => {
              const medicineDetail = medicineOptions.find(m => m.name === med.name);
              const unitPrice = medicineDetail?.price || 0;
              const quantity = med.quantity || 1;
              return {
                id: treatmentItems.length + treatmentPlanBillItems.length + index + 2,
                description: `${med.name} (${med.dosage})`,
                quantity: quantity,
                unit_price: unitPrice,
                total: unitPrice * quantity,
                item_type: 'medicine' as const
              };
            });

          const treatmentTotal = treatmentDoneItems.reduce((s, i) => s + i.total, 0);
          const planTotal = treatmentPlanBillItems.reduce((s, i) => s + i.total, 0);
          const medicineTotal = medicineItems.reduce((s, i) => s + i.total, 0);
          const totalAmount = consultationFee + treatmentTotal + planTotal + medicineTotal;

          const billItems = [
            ...(consultationFee > 0 ? [{
              id: 1,
              description: consultationDiscount > 0
                ? `Consultation Fee (${consultationDiscount}% discount)`
                : 'Consultation Fee',
              quantity: 1,
              unit_price: consultationFee,
              total: consultationFee,
              item_type: 'consultation' as const
            }] : []),
            ...treatmentDoneItems,
            ...treatmentPlanBillItems,
            ...medicineItems
          ];

          let existingBill = null;
          try {
            existingBill = await getBillByPrescriptionId(savedPrescription.id);
          } catch (e) {
            console.log('No existing bill found or error fetching it, proceeding to create.');
          }

          if (existingBill && existingBill.id) {
            // Update existing bill with new items and amounts
            await updateBill(existingBill.id, {
              total_amount: totalAmount,
              items: billItems
            });
            console.log('Bill updated successfully with consultation fee, treatments, and medicines');
          } else {
            // Create new bill
            const billData: Bill = {
              prescription_id: savedPrescription.id,
              patient_id: patient.id,
              reference_number: patient.reference_number || '',
              total_amount: totalAmount,
              paid_amount: 0,
              payment_status: 'PENDING',
              items: billItems
            };

            await createBill(billData);
            console.log('Bill auto-created successfully with consultation fee, treatments, and medicines');
          }
        } catch (billError) {
          console.error('Failed to auto-create or update bill:', billError);
          // Don't throw error - prescription is saved, bill creation is secondary
        }
      }

      setSaveSuccess(true);
    } catch (err) {
      console.error('Failed to save prescription:', err);

      // Extract the error message properly
      let errorMessage = 'An unknown error occurred';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String(err.message);
      }

      alert('Failed to save prescription: ' + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Format teeth information for prescription in a more technical, concise way
      const teethInfo = selectedTeeth.length > 0
        ? selectedTeeth.reduce((acc, tooth) => {
          return `${acc}${acc ? ', ' : ''}#${tooth.id} (${tooth.disease})`;
        }, '')
        : '';

      // Prepare data for API, considering the pre-existing template fields
      const prescriptionData = {
        ...formData,
        referenceNumber: formData.reference_number || patientReferenceNumber || '',
        medicines: medicines.length > 0 ? medicines : undefined,
        dentalNotation: teethInfo,
        clinicalNotes: oralExamNotes
          ? `${formData.de}${formData.de ? '; ' : ''}${oralExamNotes}`
          : formData.de,
        investigation: formData.investigation,
        // Convert TreatmentPlanItem[] → string[] for the PDF generator
        treatmentPlan: formData.treatmentPlan.map(item =>
          `${item.name}${item.cost ? ` (Rs.${item.cost})` : ''}${item.notes ? ' - ' + item.notes : ''}`
        ),
      };

      console.log('Sending prescription data to API:', prescriptionData);

      const res = await fetch('/api/generate-prescription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prescriptionData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to generate prescription: ${res.status} ${res.statusText}`);
      }

      const blob = await res.blob();

      // Clean up old URL if it exists
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }

      // Create new URL
      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);

      console.log('PDF generated successfully');

      // After successfully generating PDF, also save to database
      await savePrescriptionToDatabase();
    } catch (err) {
      console.error('PDF generation error:', err);

      // Extract error message
      let errorMessage = 'Failed to generate prescription PDF. Please try again.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl || !formData.patientName) return;

    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `prescription-${formData.patientName}-${formData.date}.pdf`;
    a.click();
  };

  const handlePrint = () => {
    if (!pdfUrl) return;

    const printWindow = window.open(pdfUrl);
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handlePrintablePrescription = () => {
    if (!prescriptionId) {
      alert('Please save the prescription first.');
      return;
    }
    const sigFile = selectedDoctor === 'anjali' ? 'sign1.png' : 'sign.png';
    const docName = selectedDoctor === 'anjali' ? 'Dr. Anjali Swaroop' : 'Dr. Kautilya Swaroop';
    window.open(`/print-prescription?prescriptionId=${prescriptionId}&signature=${sigFile}&doctorName=${encodeURIComponent(docName)}`, '_blank');
  };

  // Function to generate and print bill with payment details
  const toggleBillForm = async () => {
    if (!prescriptionId) {
      alert('Please save the prescription first before generating a bill.');
      return;
    }

    if (!patientReferenceNumber) {
      alert('Patient reference number is missing. Please save the prescription again or refresh the page.');
      return;
    }

    try {
      // Fetch the bill by prescription ID
      const billData = await getBillByPrescriptionId(prescriptionId);

      console.log('Fetched bill data:', billData);

      // getBillByPrescriptionId returns an array, get the first bill
      let bill = Array.isArray(billData) ? billData[0] : billData;

      // If no bill exists yet, create one now from whatever data we have
      if (!bill || !bill.id) {
        if (!patientReferenceNumber) {
          alert('Patient reference number is missing. Please save the prescription again.');
          return;
        }
        try {
          const planItems = formData.treatmentPlan
            .filter(tp => tp.cost > 0)
            .map((tp, i) => ({
              id: i + 1,
              description: tp.name + (tp.notes ? ` (${tp.notes})` : ''),
              quantity: 1,
              unit_price: tp.cost,
              total: tp.cost,
              item_type: 'procedure' as const,
            }));
          const doneItems = treatmentItems.map((item, i) => ({
            id: planItems.length + i + 1,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total: item.total,
            item_type: 'procedure' as const,
          }));
          const allItems = [...planItems, ...doneItems];
          if (allItems.length === 0) {
            alert('Please add at least one item in Treatment Plan or Treatment Done before generating a bill.');
            return;
          }
          const total = allItems.reduce((s, i) => s + i.total, 0);
          // Find patient id from a fresh patient lookup
          const pt = await getPatientByReference(patientReferenceNumber);
          if (!pt?.id) {
            alert('Patient not found. Please save the prescription first.');
            return;
          }
          const created = await createBill({
            prescription_id: prescriptionId!,
            patient_id: pt.id,
            reference_number: patientReferenceNumber,
            total_amount: total,
            paid_amount: 0,
            payment_status: 'PENDING',
            items: allItems,
          });
          bill = created;
        } catch (createErr) {
          console.error('Failed to auto-create bill:', createErr);
          alert('Failed to create bill. Please save the prescription first.');
          return;
        }
      }

      console.log('Using bill:', bill);

      // Set current bill and payment details
      setCurrentBill(bill);
      setPaymentDetails({
        amountPaid: bill.paid_amount || 0,
        paymentMethod: bill.payment_method || 'Cash',
        discountPercent: bill.discount_percent || 0,
      });

      // Show payment modal
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Error generating bill:', error);
      alert('Failed to generate bill. Please save the prescription first.');
    }
  };

  // Function to update payment and print bill
  const handlePrintBill = async () => {
    if (!currentBill) return;

    try {
      // Update bill with payment details
      const discountAmt = Math.round((Number(currentBill.total_amount) * paymentDetails.discountPercent) / 100);
      const newTotal = Math.round(Number(currentBill.total_amount) - discountAmt);
      const safePaid = Math.round(Math.min(Math.max(paymentDetails.amountPaid, 0), newTotal));
      await updateBill(currentBill.id, {
        paid_amount: safePaid,
        payment_method: paymentDetails.paymentMethod,
        discount_percent: paymentDetails.discountPercent,
        discount_amount: discountAmt,
        total_amount: newTotal,
        balance_amount: Math.max(newTotal - safePaid, 0),
      });

      // Close modal
      setShowPaymentModal(false);

      // Build signature params from selected doctor
      const sigFile = selectedDoctor === 'anjali' ? 'sign1.png' : 'sign.png';
      const docName = selectedDoctor === 'anjali' ? 'Dr. Anjali Swaroop' : 'Dr. Kautilya Swaroop';

      // Open new printable bill page (fresh fetch ensures updated balance)
      window.open(`/print-bill?billId=${currentBill.id}&signature=${sigFile}&doctorName=${encodeURIComponent(docName)}`, '_blank');
    } catch (error) {
      console.error('Error updating bill:', error);
      alert('Failed to update bill payment details.');
    }
  };

  // Modified useEffect to include pdfUrl in dependencies  // Only run this effect once on mount to prefill form data from URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isEdit = params.get('edit') === 'true';
      const id = params.get('id');

      if (isEdit && id && id !== 'undefined' && id !== 'null') {
        setIsEditMode(true);
        setPrescriptionId(id);
        loadPrescriptionData(id);
      } else {
        const phoneFromUrl = params.get('phone') || params.get('phoneNumber') || '';
        const newFormData = {
          patientName: params.get('patientName') || '',
          age: params.get('age') || '',
          sex: params.get('sex') || '',
          phoneNumber: phoneFromUrl,
          date: params.get('date') || new Date().toISOString().slice(0, 10),
          cc: params.get('chiefComplaint') || '',
          mh: params.get('medicalHistory') || '',
          de: params.get('diagnosis') || '',
          advice: params.get('advice') || '',
          followupDate: params.get('followupDate') || '',
        };

        setFormData(prev => ({ ...prev, ...newFormData }));

        // If a phone number was passed via URL, prefill clinical fields from latest prescription
        if (phoneFromUrl && phoneFromUrl.length >= 10) {
          (async () => {
            try {
              const latestRx = await convexClient.query(api.prescriptions.getLatestByPhone, { phone_number: phoneFromUrl });
              if (latestRx) {
                const safeParse = (data: any, fallback: any = []) => {
                  if (typeof data === 'string') { try { return JSON.parse(data); } catch { return fallback; } }
                  return data || fallback;
                };
                const normTreatmentPlan = (raw: any): TreatmentPlanItem[] => {
                  if (!Array.isArray(raw)) return [];
                  return raw.map((item: any) => {
                    if (typeof item === 'string') return { name: item, cost: 0, notes: '' };
                    return { name: item.name || String(item), cost: item.cost || 0, notes: item.notes || '' };
                  });
                };

                const loadedCC = latestRx.chief_complaint || '';
                setPrevLoadedCC(loadedCC);

                setFormData(prevData => ({
                  ...prevData,
                  cc: loadedCC,
                  mh: latestRx.medical_history || prevData.mh,
                  investigation: latestRx.investigation || '',
                  de: latestRx.diagnosis || '',
                  treatmentPlan: normTreatmentPlan(safeParse(latestRx.treatment_plan)),
                }));

                if (latestRx.oral_exam_notes) setOralExamNotes(latestRx.oral_exam_notes);

                const teethRaw = safeParse(latestRx.selected_teeth);
                if (Array.isArray(teethRaw) && teethRaw.length > 0) {
                  setSelectedTeeth(teethRaw.map((t: any) => ({
                    id: t.id, type: t.type || 'Permanent', category: t.category || '', disease: t.disease || '',
                  })));
                }

                const medsRaw = safeParse(latestRx.medicines);
                if (Array.isArray(medsRaw) && medsRaw.length > 0) setMedicines(medsRaw);

                const doneRaw = safeParse(latestRx.treatment_done);
                if (Array.isArray(doneRaw) && doneRaw.length > 0) {
                  setTreatmentItems(doneRaw.map((item: any) => ({
                    id: item.id || Math.random(),
                    description: item.description || '',
                    quantity: item.quantity || 1,
                    unitPrice: item.unit_price || item.unitPrice || 0,
                    total: item.total || 0,
                  })));
                }
              }
            } catch (rxError) {
              console.error('Error prefilling clinical fields from URL phone:', rxError);
            }
          })();
        }
      }
    }
  }, [loadPrescriptionData]); // Include loadPrescriptionData as a dependency

  return (
    <div className="w-[80vw] mx-auto mt-8 p-4">
      {isStaffUser ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200 max-w-2xl">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Restricted</h1>
            <p className="text-gray-600">You don&apos;t have permission to access the prescription page.</p>
          </div>
        </div>
      ) : (
        <>
          <h2 className="text-3xl font-bold mb-8 text-center text-blue-700 border-b pb-4">
            {isEditMode ? 'Edit Prescription' : 'Create Prescription'}
          </h2>
          {userEmail && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">Logged in as: <span className="font-medium text-gray-900">{userEmail}</span></p>
            </div>
          )}
          {/* Success Message */}
          {saveSuccess && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              <p className="font-medium">Prescription saved successfully to the database!</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Patient Information Section */}                <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
              <h3 className="text-xl font-semibold mb-4 text-blue-800">Patient Information</h3>                  {formData.reference_number && (
                <div className="mb-4 p-3 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Patient Reference: <span className="font-medium">{formData.reference_number}</span>
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                  <input
                    type="text"
                    name="patientName"
                    value={formData.patientName}
                    onChange={handleChange}
                    className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    required
                    placeholder="Enter patient's full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    required
                    placeholder="Years"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
                  <select
                    name="sex"
                    value={formData.sex}
                    onChange={handleChange}
                    className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Added Phone Number Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handlePhoneNumberChange}
                    className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Enter patient's phone number"
                  />
                  <p className="text-xs text-gray-500 mt-1">Patient data will auto-fill if phone exists</p>
                </div>
              </div>
            </div>

            {/* Medical Information Section */}
            <div className="bg-green-50 p-6 rounded-lg border border-green-100">
              <h3 className="text-xl font-semibold mb-4 text-green-800">Medical Information</h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chief Complaint (C/C)</label>
                    <textarea
                      name="cc"
                      value={formData.cc}
                      onChange={handleChange}
                      onBlur={handleCCBlur}
                      className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                      rows={3}
                      placeholder="Patient's main complaint"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medical/Dental History (M/H)</label>
                    <textarea
                      name="mh"
                      value={formData.mh}
                      onChange={handleChange}
                      className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                      rows={3}
                      placeholder="Relevant medical history"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Investigation <span className="text-gray-500 text-xs">(Optional)</span>
                  </label>
                  <textarea
                    name="investigation"
                    value={formData.investigation}
                    onChange={handleChange}
                    className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                    rows={2}
                    placeholder="Any investigations or tests recommended (e.g., X-ray, CBCT, Blood tests)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis (D/E)</label>
                  <textarea
                    name="de"
                    value={formData.de}
                    onChange={handleChange}
                    className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                    rows={3}
                    placeholder="Clinical diagnosis"
                  />
                </div>

                {/* Treatment Plan Section — catalog-based with cost + notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Treatment Plan <span className="text-gray-500 text-xs">(Optional)</span>
                  </label>

                  {/* Existing plan items */}
                  {formData.treatmentPlan.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {formData.treatmentPlan.map((item, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-white border border-gray-200 rounded-lg">
                          <span className="text-sm text-gray-500 mt-1 w-5 flex-shrink-0">{index + 1}.</span>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const newPlan = [...formData.treatmentPlan];
                                newPlan[index] = { ...newPlan[index], name: e.target.value };
                                setFormData({ ...formData, treatmentPlan: newPlan });
                              }}
                              className="p-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="Treatment name"
                            />
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                              <input
                                type="number"
                                value={item.cost || ''}
                                onChange={(e) => {
                                  const newPlan = [...formData.treatmentPlan];
                                  newPlan[index] = { ...newPlan[index], cost: parseFloat(e.target.value) || 0 };
                                  setFormData({ ...formData, treatmentPlan: newPlan });
                                }}
                                className="w-full pl-6 p-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="Cost"
                                min="0"
                              />
                            </div>
                            <input
                              type="text"
                              value={item.notes || ''}
                              onChange={(e) => {
                                const newPlan = [...formData.treatmentPlan];
                                newPlan[index] = { ...newPlan[index], notes: e.target.value };
                                setFormData({ ...formData, treatmentPlan: newPlan });
                              }}
                              className="p-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="Notes (optional)"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newPlan = formData.treatmentPlan.filter((_, i) => i !== index);
                              setFormData({ ...formData, treatmentPlan: newPlan });
                            }}
                            className="text-red-500 hover:text-red-700 mt-1 text-lg leading-none flex-shrink-0"
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Search / add new plan item */}
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={tpSearchQuery}
                          onChange={(e) => {
                            setTpSearchQuery(e.target.value);
                            setTpPendingName(e.target.value);
                            setShowTpDropdown(true);
                          }}
                          onFocus={() => setShowTpDropdown(true)}
                          onBlur={() => setTimeout(() => setShowTpDropdown(false), 150)}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Search or type treatment name..."
                        />
                        {showTpDropdown && tpSearchQuery.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {dentalProcedures
                              .filter(p => p.name.toLowerCase().includes(tpSearchQuery.toLowerCase()))
                              .map(proc => (
                                <button
                                  key={proc.id}
                                  type="button"
                                  onMouseDown={() => {
                                    setTpPendingName(proc.name);
                                    setTpPendingCost(proc.price);
                                    setTpSearchQuery(proc.name);
                                    setShowTpDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex justify-between"
                                >
                                  <span>{proc.name}</span>
                                  <span className="text-gray-500">₹{proc.price}</span>
                                </button>
                              ))}
                            {dentalProcedures.filter(p => p.name.toLowerCase().includes(tpSearchQuery.toLowerCase())).length === 0 && (
                              <div className="px-3 py-2 text-xs text-gray-500">No match — will add as custom</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="relative w-28">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                        <input
                          type="number"
                          value={tpPendingCost || ''}
                          onChange={(e) => setTpPendingCost(parseFloat(e.target.value) || 0)}
                          className="w-full pl-6 p-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Cost"
                          min="0"
                        />
                      </div>
                      <input
                        type="text"
                        value={tpPendingNotes}
                        onChange={(e) => setTpPendingNotes(e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Notes (optional)"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const name = tpPendingName.trim() || tpSearchQuery.trim();
                          if (!name) return;
                          const newItem: TreatmentPlanItem = { name, cost: tpPendingCost, notes: tpPendingNotes.trim() };
                          setFormData({ ...formData, treatmentPlan: [...formData.treatmentPlan, newItem] });
                          setTpSearchQuery('');
                          setTpPendingName('');
                          setTpPendingCost(0);
                          setTpPendingNotes('');
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm whitespace-nowrap"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Quick-add frequent treatments */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {dentalProcedures.slice(0, 6).map(proc => (
                      <button
                        key={proc.id}
                        type="button"
                        onClick={() => {
                          const newItem: TreatmentPlanItem = { name: proc.name, cost: proc.price, notes: '' };
                          setFormData({ ...formData, treatmentPlan: [...formData.treatmentPlan, newItem] });
                        }}
                        className="px-2 py-1 text-xs bg-green-50 border border-green-200 text-green-700 rounded-full hover:bg-green-100 transition"
                        title={`₹${proc.price}`}
                      >
                        + {proc.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Oral Examination Section with Dropdown Selection */}
            <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100">
              <div className="flex items-center justify-between mb-4 gap-3">
                <h3 className="text-xl font-semibold text-indigo-800">Oral Examination</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDiseaseForm(prev => !prev);
                    if (showAddDiseaseForm) {
                      setNewDiseaseName('');
                    }
                  }}
                  className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition border border-indigo-300 font-medium whitespace-nowrap"
                >
                  {showAddDiseaseForm ? 'Close' : '+ Add New Disease'}
                </button>
              </div>

              {/* Dropdown Selection for Teeth */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Multiple Teeth</label>
                  <select
                    multiple
                    value={selectedTeethNumbers}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions).map(option => option.value);
                      setSelectedTeethNumbers(selected);
                    }}
                    className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    size={8}
                  >
                    {[1, 2, 3, 4].map(quadrant => (
                      <optgroup key={quadrant} label={DENTAL_QUADRANTS.find(q => q.id === quadrant)?.name || `Quadrant ${quadrant}`}>
                        {TEETH_BY_QUADRANT[quadrant as 1 | 2 | 3 | 4].map((tooth) => (
                          <option key={`${quadrant}${tooth.number}`} value={`${quadrant}${tooth.number}`}>
                            {`${quadrant}${tooth.number} - ${tooth.name}`}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">Hold Ctrl/Cmd key to select multiple teeth</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dental Disease</label>
                  <select
                    value={selectedDisease}
                    onChange={(e) => setSelectedDisease(e.target.value)}
                    disabled={!selectedTeethNumbers?.length}
                    className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  >
                    <option value="">Select Disease</option>
                    {dentalDiseases.map((disease) => (
                      <option key={disease} value={disease}>
                        {disease}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleAddTeeth}
                    disabled={!selectedTeethNumbers?.length || !selectedDisease}
                    className="mt-4 w-full p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Selected Teeth
                  </button>
                </div>
              </div>

              {/* Oral Examination Notes */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Examination Notes</label>
                <textarea
                  value={oralExamNotes}
                  onChange={(e) => setOralExamNotes(e.target.value)}
                  className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  rows={4}
                  placeholder="Additional notes about the oral examination..."
                />
              </div>

              {/* Selected Teeth Summary */}
              {selectedTeeth.length > 0 && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-indigo-200">
                  <h4 className="font-medium text-indigo-800 mb-2">Selected Teeth Summary:</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tooth Number</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quadrant</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disease</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedTeeth.map((tooth) => {
                          // Convert numeric ID back to quadrant+letter format for display
                          const toothId = tooth.id.toString();
                          const quadrant = toothId[0];
                          const number = parseInt(toothId.slice(1));
                          const displayId = number >= 9
                            ? `${quadrant}${String.fromCharCode(65 + (number - 9))}` // Convert 9->A, 10->B, etc.
                            : tooth.id;

                          return (
                            <tr key={tooth.id}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{displayId}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{tooth.category}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{tooth.disease}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTooth(tooth.id)}
                                  className="text-red-600 hover:text-red-800 transition"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Preview of dental notation that will appear on prescription */}
                  <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Dental Notation for Prescription:</span> {
                        selectedTeeth.map((tooth, index) => {
                          const toothId = tooth.id.toString();
                          const quadrant = toothId[0];
                          const number = parseInt(toothId.slice(1));
                          const displayId = number >= 9
                            ? `${quadrant}${String.fromCharCode(65 + (number - 9))}` // Convert 9->A, 10->B, etc.
                            : tooth.id;

                          return `${index > 0 ? ', ' : ''}#${displayId} (${tooth.disease})`;
                        }).join('')
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Add New Dental Disease Form */}
              {showAddDiseaseForm && (
                <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <h4 className="font-medium text-indigo-800 mb-3">Add New Disease to List:</h4>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newDiseaseName}
                      onChange={(e) => setNewDiseaseName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddNewDisease();
                        }
                      }}
                      placeholder="Enter disease name"
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddNewDisease}
                      disabled={!newDiseaseName.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddDiseaseForm(false);
                        setNewDiseaseName('');
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                    >
                      Cancel
                    </button>
                  </div>

                  {dentalDiseases.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {dentalDiseases.map((disease) => (
                        <div key={disease} className="bg-white px-3 py-1 rounded-full border border-indigo-300 flex items-center gap-2 text-sm">
                          <span>{disease}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDisease(disease)}
                            className="text-red-600 hover:text-red-800 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>


            {/* Treatment Done Section */}
            <div className="bg-teal-50 p-6 rounded-lg border border-teal-100">
              <div className="flex items-center justify-between mb-4 gap-3">
                <h3 className="text-xl font-semibold text-teal-800">Treatment Done</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTreatmentForm(prev => !prev);
                    if (showAddTreatmentForm) {
                      setNewTreatmentName('');
                      setNewTreatmentPrice('');
                    }
                  }}
                  className="px-4 py-2 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition border border-teal-300 font-medium whitespace-nowrap"
                >
                  {showAddTreatmentForm ? 'Close' : '+ Add New Treatment'}
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">Add treatments/services completed during this visit. Bills will be auto-generated from these items.</p>

              {/* Add Treatment/Service */}
              <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-3">Add Service/Procedure</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-600 mb-1">Service/Procedure</label>
                    <select
                      value=""
                      onChange={(e) => {
                        const selected = dentalProcedures.find(p => p.name === e.target.value);
                        if (selected) {
                          const newItem: TreatmentItem = {
                            id: treatmentItems.length + 1,
                            description: selected.name,
                            quantity: 1,
                            unitPrice: selected.price,
                            total: selected.price
                          };
                          setTreatmentItems([...treatmentItems, newItem]);
                        }
                      }}
                      className="mt-1 block w-full p-3 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select Service</option>
                      {dentalProcedures.map(proc => (
                        <option key={proc.id} value={proc.name}>{proc.name} - ₹{proc.price}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Treatment Items Table */}
              {treatmentItems.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price (₹)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (₹)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {treatmentItems.map((item, index) => (
                        <tr key={item.id || index}>
                          <td className="px-4 py-3 whitespace-nowrap">{index + 1}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => {
                                const newItems = [...treatmentItems];
                                newItems[index].description = e.target.value;
                                setTreatmentItems(newItems);
                              }}
                              className="w-full p-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...treatmentItems];
                                newItems[index].quantity = parseInt(e.target.value) || 1;
                                newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
                                setTreatmentItems(newItems);
                              }}
                              className="w-20 p-1 border border-gray-300 rounded"
                              min="1"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const newItems = [...treatmentItems];
                                newItems[index].unitPrice = parseFloat(e.target.value) || 0;
                                newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
                                setTreatmentItems(newItems);
                              }}
                              className="w-24 p-1 border border-gray-300 rounded"
                              min="0"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            ₹{item.total.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setTreatmentItems(treatmentItems.filter((_, i) => i !== index));
                              }}
                              className="text-red-600 hover:text-red-900 focus:outline-none"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right font-bold">Total Amount:</td>
                        <td colSpan={2} className="px-4 py-3 font-bold text-lg text-teal-700">
                          ₹{treatmentItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Add New Treatment to List Form */}
              {showAddTreatmentForm && (
                <div className="mt-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <h4 className="font-medium text-teal-800 mb-3">Add New Treatment to List:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                    <input
                      type="text"
                      value={newTreatmentName}
                      onChange={(e) => setNewTreatmentName(e.target.value)}
                      placeholder="Treatment name"
                      className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      autoFocus
                    />
                    <input
                      type="number"
                      value={newTreatmentPrice}
                      onChange={(e) => setNewTreatmentPrice(e.target.value)}
                      placeholder="Price (₹)"
                      className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      min="0"
                      step="0.01"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddNewTreatment}
                        disabled={!newTreatmentName.trim() || !newTreatmentPrice.trim()}
                        className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddTreatmentForm(false);
                          setNewTreatmentName('');
                          setNewTreatmentPrice('');
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  {dentalProcedures.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {dentalProcedures.map((procedure) => (
                        <div key={procedure.id} className="bg-white px-3 py-1 rounded-full border border-teal-300 flex items-center gap-2 text-sm">
                          <span>{procedure.name} (₹{procedure.price})</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTreatment(procedure.id)}
                            className="text-red-600 hover:text-red-800 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Medicines Section */}
            <div className="bg-purple-50 p-6 rounded-lg border border-purple-100">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-semibold text-purple-800">Prescribed Medicines (Optional)</h3>
                {medicines.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setMedicines([{ name: '', dosage: '', duration: '', quantity: 1 }])}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition shadow-sm"
                  >
                    Add Medicine
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={addMedicine}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition shadow-sm"
                  >
                    Add Another Medicine
                  </button>
                )}
              </div>
              <p className="text-sm text-purple-700 mb-4">
                💡 Medicine sales are automatically recorded and inventory is updated when you save this prescription.
              </p>

              {medicines.length > 0 && (
                <div className="space-y-4">
                  {medicines.map((medicine, index) => (
                    <div key={index} className="flex items-center space-x-3 p-4 border rounded-lg bg-white shadow-sm">
                      <div className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Medicine</label>
                          <select
                            value={medicine.name}
                            onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                            className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                            required
                          >
                            <option value="">Select Medicine</option>
                            {medicineOptions.map((med) => (
                              <option key={med.id} value={med.name}>{med.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity
                            <span className="ml-1 text-xs text-gray-500">(Auto-calculated)</span>
                          </label>
                          <input
                            type="number"
                            value={medicine.quantity || 1}
                            onChange={(e) => handleMedicineChange(index, 'quantity', parseInt(e.target.value) || 1)}
                            min="1"
                            placeholder="Auto-calculated"
                            className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition bg-blue-50"
                            title="Automatically calculated from dosage × duration. You can still edit manually if needed."
                          />
                          {medicine.dosage && medicine.duration && (
                            <p className="text-xs text-gray-600 mt-1">
                              {parseDosage(medicine.dosage)} pills/day × {parseDuration(medicine.duration)} days
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
                          <input
                            type="text"
                            value={medicine.dosage}
                            onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                            placeholder="e.g., 1-0-1"
                            className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                          <input
                            type="text"
                            value={medicine.duration}
                            onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                            placeholder="e.g., 7 days"
                            className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                            required
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMedicine(index)}
                        className="mt-6 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Information Section */}
            <div className="bg-amber-50 p-6 rounded-lg border border-amber-100">
              <h3 className="text-xl font-semibold mb-4 text-amber-800">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Advice Given</label>
                  <textarea
                    name="advice"
                    value={formData.advice}
                    onChange={handleChange}
                    className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                    rows={4}
                    placeholder="Special instructions or advice for the patient"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    name="followupDate"
                    value={formData.followupDate}
                    onChange={handleChange}
                    className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                  />
                  <p className="mt-2 text-sm text-gray-500">Leave empty if no follow-up is required</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {/* Doctor / Signature Selector */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Signing Doctor</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="selectedDoctor"
                    value="kautilya"
                    checked={selectedDoctor === 'kautilya'}
                    onChange={() => setSelectedDoctor('kautilya')}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm">Dr. Kautilya Swaroop</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="selectedDoctor"
                    value="anjali"
                    checked={selectedDoctor === 'anjali'}
                    onChange={() => setSelectedDoctor('anjali')}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm">Dr. Anjali Swaroop</span>
                </label>
              </div>
            </div>

            {/* Consultation Charge */}
            <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  id="applyConsultationCharge"
                  checked={applyConsultationCharge}
                  onChange={e => setApplyConsultationCharge(e.target.checked)}
                  className="h-4 w-4 text-amber-600 cursor-pointer"
                />
                <label htmlFor="applyConsultationCharge" className="text-sm font-semibold text-amber-800 cursor-pointer">
                  Apply Consultation Charge
                </label>
              </div>
              {applyConsultationCharge && (
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Charge (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={consultationCharge}
                      onChange={e => setConsultationCharge(Math.max(0, Number(e.target.value)))}
                      className="w-28 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Discount (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={consultationDiscount}
                      onChange={e => setConsultationDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <span className="text-sm font-semibold text-amber-800">
                      Net: ₹{(consultationCharge * (1 - consultationDiscount / 100)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row justify-center gap-4 mt-4">
              <button
                type="submit"
                className="px-8 py-3 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-2 disabled:opacity-50 transition shadow-md"
                disabled={loading || saving}
              >
                {loading ? 'Saving...' : saving ? 'Saving Prescription...' : isEditMode ? 'Update Prescription' : 'Save Prescription'}
              </button>

              <button
                type="button"
                onClick={handlePrintablePrescription}
                disabled={!prescriptionId}
                className="px-8 py-3 bg-purple-600 text-white text-lg font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-300 focus:ring-offset-2 disabled:opacity-50 transition shadow-md flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Prescription
              </button>
            </div>
          </form>
          {/* Generate Bill Button - Moved outside form */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={toggleBillForm}
              className={`w-full md:w-auto px-8 py-3 text-white text-lg font-medium rounded-lg focus:outline-none focus:ring-4 focus:ring-offset-2 transition shadow-md flex items-center justify-center gap-2 ${prescriptionId
                ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-300'
                : 'bg-gray-400 cursor-not-allowed'
                }`}
              disabled={!prescriptionId}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Generate Bill
            </button>
            {!prescriptionId && (
              <p className="text-sm text-gray-600">Save the prescription first to generate a bill</p>
            )}
          </div>

          {/* Prescription Preview Section */}
          <div className="mt-12 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-center text-blue-700 border-b pb-4">
              Prescription Preview
            </h2>
            <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden p-8">
              {/* Header */}
              <div className="mb-6">
                <div className="text-sm mb-1">
                  <strong>Date:</strong> {formData.date ? new Date(formData.date).toLocaleDateString('en-GB') : 'Not set'}
                </div>
                {formData.reference_number && (
                  <div className="text-sm">
                    <strong>Prescription No.:</strong> {formData.reference_number}
                  </div>
                )}
              </div>

              {/* I. Patient Information */}
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-3">I. Patient Information</h3>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-1/3">Field</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium">Patient Name</td>
                      <td className="border border-gray-300 px-4 py-2">{formData.patientName || 'Not entered'}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium">Age</td>
                      <td className="border border-gray-300 px-4 py-2">{formData.age || 'Not entered'}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium">Gender</td>
                      <td className="border border-gray-300 px-4 py-2">{formData.sex || 'Not entered'}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium">Contact Information</td>
                      <td className="border border-gray-300 px-4 py-2">{formData.phoneNumber || 'Not entered'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* II. Prescription Details */}
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-3">II. Prescription Details</h3>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold w-1/3">Field</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.cc && (
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 font-medium">Chief Complaint</td>
                        <td className="border border-gray-300 px-4 py-2 whitespace-pre-wrap">{formData.cc}</td>
                      </tr>
                    )}
                    {formData.mh && (
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 font-medium">Medical History</td>
                        <td className="border border-gray-300 px-4 py-2 whitespace-pre-wrap">{formData.mh}</td>
                      </tr>
                    )}
                    {formData.investigation && (
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 font-medium">Investigation</td>
                        <td className="border border-gray-300 px-4 py-2 whitespace-pre-wrap">{formData.investigation}</td>
                      </tr>
                    )}
                    {formData.de && (
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 font-medium">Diagnosis</td>
                        <td className="border border-gray-300 px-4 py-2 whitespace-pre-wrap">{formData.de}</td>
                      </tr>
                    )}
                    {selectedTeeth.length > 0 && (
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 font-medium">Dental Notation</td>
                        <td className="border border-gray-300 px-4 py-2">
                          {selectedTeeth.map(tooth => `#${tooth.id} (${tooth.disease})`).join(', ')}
                        </td>
                      </tr>
                    )}
                    {oralExamNotes && (
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 font-medium">Oral Examination</td>
                        <td className="border border-gray-300 px-4 py-2 whitespace-pre-wrap">{oralExamNotes}</td>
                      </tr>
                    )}
                    {formData.treatmentPlan && formData.treatmentPlan.length > 0 && (
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 font-medium">Treatment Plan</td>
                        <td className="border border-gray-300 px-4 py-2">
                          <ul className="list-disc list-inside space-y-1">
                            {formData.treatmentPlan.map((item, idx) => (
                              <li key={idx}>
                                {item.name}
                                {item.cost ? <span className="text-gray-600"> — ₹{item.cost}</span> : null}
                                {item.notes ? <span className="text-gray-500 text-xs"> ({item.notes})</span> : null}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                    {formData.advice && (
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 font-medium">Special Instructions</td>
                        <td className="border border-gray-300 px-4 py-2 whitespace-pre-wrap">{formData.advice}</td>
                      </tr>
                    )}
                    {formData.followupDate && (
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 font-medium">Next Appointment</td>
                        <td className="border border-gray-300 px-4 py-2">
                          {new Date(formData.followupDate).toLocaleDateString('en-GB')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* III. Medications */}
              {medicines.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-3">III. Medications</h3>
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Medication</th>
                        <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Dosage</th>
                        <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Frequency</th>
                        <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicines.map((med, idx) => (
                        <tr key={idx}>
                          <td className="border border-gray-300 px-4 py-2">{med.name || 'Not specified'}</td>
                          <td className="border border-gray-300 px-4 py-2">{med.dosage || 'Not specified'}</td>
                          <td className="border border-gray-300 px-4 py-2">
                            {med.dosage || 'Not specified'}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">{med.duration || 'Not specified'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* IV. Treatment Done */}
              {treatmentItems.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-3">IV. Treatment Done</h3>
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {treatmentItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="border border-gray-300 px-4 py-2">{item.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Signature */}
              <div className="mt-12 text-right">
                <div className="mb-4">
                  <img
                    src={selectedDoctor === 'anjali' ? '/sign1.png' : '/sign.png'}
                    alt="Doctor's Signature"
                    className="inline-block"
                    style={{ height: '60px', width: 'auto' }}
                  />
                </div>
                <div className="font-semibold">
                  {selectedDoctor === 'anjali' ? 'Dr. Anjali Swaroop' : 'Dr. Kautilya Swaroop'}
                </div>
              </div>
            </div>
          </div>

          {/* Hidden iframe for PDF preview/loading */}
          {pdfUrl && (
            <div className="hidden">
              <iframe
                src={pdfUrl}
                title="Prescription PDF"
              />
            </div>
          )}

          {/* Payment Details Modal */}
          {showPaymentModal && currentBill && (
            <div className="fixed inset-0 backdrop-blur-sm bg-white/10 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Payment Details</h3>

                {(() => {
                  const origTotal = Number(currentBill.total_amount);
                  const discAmt = Math.round((origTotal * paymentDetails.discountPercent) / 100);
                  const payable = Math.round(origTotal - discAmt);
                  const balance = Math.max(payable - Math.round(paymentDetails.amountPaid), 0);
                  return (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-1">Total Amount: <span className="font-bold text-gray-900">₹{origTotal.toLocaleString('en-IN')}</span></p>
                      {paymentDetails.discountPercent > 0 && (
                        <p className="text-sm text-gray-600 mb-1">Discount ({paymentDetails.discountPercent}%): <span className="font-bold text-green-600">- ₹{discAmt.toLocaleString('en-IN')}</span></p>
                      )}
                      <p className="text-sm text-gray-600 mb-1">Payable: <span className="font-bold text-gray-900">₹{payable.toLocaleString('en-IN')}</span></p>
                      <p className="text-sm text-gray-600 mb-4">Balance Due: <span className="font-bold text-red-600">₹{balance.toLocaleString('en-IN')}</span></p>
                    </div>
                  );
                })()}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={paymentDetails.discountPercent}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, discountPercent: Math.min(Math.max(parseFloat(e.target.value) || 0, 0), 100) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount Paid (₹)</label>
                  <input
                    type="number"
                    min="0"
                    max={Math.round(Number(currentBill.total_amount) - Math.round((Number(currentBill.total_amount) * paymentDetails.discountPercent) / 100))}
                    step="1"
                    value={paymentDetails.amountPaid}
                    onChange={(e) => {
                      const payable = Math.round(Number(currentBill.total_amount) - Math.round((Number(currentBill.total_amount) * paymentDetails.discountPercent) / 100));
                      const val = Math.round(Math.min(Math.max(parseFloat(e.target.value) || 0, 0), payable));
                      setPaymentDetails({ ...paymentDetails, amountPaid: val });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select
                    value={paymentDetails.paymentMethod}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">
                    Payment Status:
                    {(() => {
                      const payable = Math.round(Number(currentBill.total_amount) - Math.round((Number(currentBill.total_amount) * paymentDetails.discountPercent) / 100));
                      const status = paymentDetails.amountPaid === 0 ? 'PENDING' : paymentDetails.amountPaid >= payable ? 'PAID' : 'PARTIAL';
                      const cls = status === 'PENDING' ? 'bg-red-100 text-red-700' : status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
                      return <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${cls}`}>{status}</span>;
                    })()}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintBill}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Print Bill
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PrescriptionPage;