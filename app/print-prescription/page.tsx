'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getPrescriptionById } from '@/services/prescription';

interface ToothData {
  id: number;
  type: string;
  category: string;
  disease: string;
}

interface MedicineEntry {
  name: string;
  dosage: string;
  duration: string;
  quantity?: number;
}

interface TreatmentItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface PrescriptionData {
  id: string;
  patient_name: string;
  phone_number: string;
  age: string;
  sex: string;
  reference_number?: string;
  prescription_date: string;
  chief_complaint?: string;
  medical_history?: string;
  investigation?: string;
  diagnosis?: string;
  treatment_plan?: any[]; // string[] (legacy) or TreatmentPlanItem objects
  oral_exam_notes?: string;
  selected_teeth?: ToothData[];
  medicines?: MedicineEntry[];
  treatment_done?: TreatmentItem[];
  advice?: string;
  followup_date?: string;
}

function PrintPrescriptionContent() {
  const searchParams = useSearchParams();
  const prescriptionId = searchParams.get('prescriptionId');
  const signatureParam = searchParams.get('signature') || 'sign.png';
  const doctorNameParam = searchParams.get('doctorName') || 'Dr. Kautilya Swaroop';
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrescriptionData = async () => {
      if (!prescriptionId) {
        setError('No prescription ID provided');
        setLoading(false);
        return;
      }

      try {
        const data = await getPrescriptionById(prescriptionId);
        setPrescriptionData(data as PrescriptionData);
      } catch (err) {
        console.error('Error fetching prescription:', err);
        setError(err instanceof Error ? err.message : 'Failed to load prescription data');
      } finally {
        setLoading(false);
      }
    };

    fetchPrescriptionData();
  }, [prescriptionId]);

  // Auto-print when data is loaded
  useEffect(() => {
    if (!loading && prescriptionData) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [loading, prescriptionData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-900">Loading prescription...</p>
        </div>
      </div>
    );
  }

  if (error || !prescriptionData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-700">{error || 'Prescription not found'}</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB');
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin-top: 7cm; 
            margin-bottom: 4cm;
            margin-left: 1.8cm;
            margin-right: 1.8cm;
          }

          body {
            margin: 0;
            padding: 0;
            background: white;
            color: black;
          }

          * {
            background: transparent !important;
            color: black !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }

          button, .no-print {
            display: none !important;
          }

          .print-content {
            width: 100%;
            margin: 0;
            padding: 0;
          }
        }

        @media screen {
          body {
            background: #d1d5db;
          }

          .print-content {
            max-width: 21cm;
            margin: 1.5cm auto;
            padding: 5cm 1.8cm 3.5cm 1.8cm;
            background: white;
            box-shadow: 0 2px 20px rgba(0,0,0,0.15);
            min-height: 29.7cm;
          }
        }

        .print-content {
          font-family: "Times New Roman", Times, Georgia, serif;
          font-size: 10.5pt;
          line-height: 1.45;
          color: #000;
        }

        /* ── Patient Info Grid ── */
        .patient-grid {
          width: 100%;
          font-size: 10pt;
          margin-bottom: 8px;
          border-top: 1.5px solid #000;
          border-bottom: 1.5px solid #000;
          padding: 4px 0;
        }

        .patient-grid .row {
          display: flex;
          line-height: 1.45;
        }

        .patient-grid .col {
          display: flex;
          width: 50%;
        }

        .patient-grid .lbl {
          font-weight: bold;
          min-width: 130px;
          padding-left: 4px;
        }

        .patient-grid .val {
          flex: 1;
        }

        /* ── Section Heading ── */
        .sec-heading {
          font-size: 10.5pt;
          font-weight: bold;
          text-decoration: underline;
          margin: 7px 0 2px 0;
          padding: 0;
        }

        /* ── Section Body ── */
        .sec-body {
          font-size: 10pt;
          line-height: 1.35;
          margin: 0 0 1px 14px;
          white-space: pre-wrap;
          text-align: justify;
        }

        /* ── Medication Table ── */
        .med-table {
          border-collapse: collapse;
          width: 100%;
          font-size: 10pt;
          margin: 4px 0 2px 0;
        }

        .med-table th {
          font-weight: bold;
          border: 1px solid #000;
          padding: 3px 8px;
          text-align: left;
        }

        .med-table td {
          border: 1px solid #000;
          padding: 3px 8px;
          text-align: left;
          vertical-align: top;
        }

        /* ── Signature Row ── */
        .sig-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 20px;
          font-size: 10pt;
        }

        .sig-block {
          text-align: center;
          min-width: 160px;
        }

        .sig-line {
          display: inline-block;
          margin-bottom: 2px;
        }

        .sig-label {
          font-weight: bold;
        }

        .sig-title {
          font-size: 9.5pt;
          margin-top: 1px;
        }
      `}</style>

      <div className="print-content">

        {/* ── Patient Information (top/bottom border only) ── */}
        <div className="patient-grid">
          <div className="row">
            <div className="col"><span className="lbl">Patient Name</span><span className="val">{prescriptionData.patient_name}</span></div>
            <div className="col"><span className="lbl">Patient Number</span><span className="val">{prescriptionData.reference_number || '—'}</span></div>
          </div>
          <div className="row">
            <div className="col"><span className="lbl">Age</span><span className="val">{prescriptionData.age}</span></div>
            <div className="col"><span className="lbl">Date</span><span className="val">{formatDate(prescriptionData.prescription_date)}</span></div>
          </div>
          <div className="row">
            <div className="col"><span className="lbl">Sex</span><span className="val">{prescriptionData.sex}</span></div>
            <div className="col"><span className="lbl">Contact No.</span><span className="val">{prescriptionData.phone_number}</span></div>
          </div>
          {prescriptionData.followup_date && (
            <div className="row">
              <div className="col"><span className="lbl">Visit Type</span><span className="val">Consultation</span></div>
              <div className="col"><span className="lbl">Follow-up Date</span><span className="val">{formatDate(prescriptionData.followup_date)}</span></div>
            </div>
          )}
        </div>

        {/* ── CHIEF COMPLAINT ── */}
        {prescriptionData.chief_complaint && (
          <>
            <p className="sec-heading">CHIEF COMPLAINT</p>
            <p className="sec-body">{prescriptionData.chief_complaint}</p>
          </>
        )}

        {/* ── MEDICAL HISTORY ── */}
        {prescriptionData.medical_history && (
          <>
            <p className="sec-heading">MEDICAL HISTORY</p>
            <p className="sec-body">{prescriptionData.medical_history}</p>
          </>
        )}

        {/* ── INVESTIGATION ── */}
        {prescriptionData.investigation && (
          <>
            <p className="sec-heading">INVESTIGATION</p>
            <p className="sec-body">{prescriptionData.investigation}</p>
          </>
        )}

        {/* ── ORAL EXAMINATION ── */}
        {(prescriptionData.oral_exam_notes || (prescriptionData.selected_teeth && prescriptionData.selected_teeth.length > 0)) && (
          <>
            <p className="sec-heading">ORAL EXAMINATION</p>
            {prescriptionData.selected_teeth && prescriptionData.selected_teeth.length > 0 && (
              <div className="sec-body">
                {prescriptionData.selected_teeth.map((tooth, index) => (
                  <div key={index}>
                    Tooth #{tooth.id} ({tooth.type}) – {tooth.disease}
                  </div>
                ))}
              </div>
            )}
            {prescriptionData.oral_exam_notes && (
              <p className="sec-body">{prescriptionData.oral_exam_notes}</p>
            )}
          </>
        )}

        {/* ── DIAGNOSIS ── */}
        {prescriptionData.diagnosis && (
          <>
            <p className="sec-heading">DIAGNOSIS</p>
            <p className="sec-body">{prescriptionData.diagnosis}</p>
          </>
        )}

        {/* ── TREATMENT PLAN ── */}
        {prescriptionData.treatment_plan && prescriptionData.treatment_plan.length > 0 && (
          <>
            <p className="sec-heading">TREATMENT PLAN</p>
            <div className="sec-body">
              {prescriptionData.treatment_plan.map((step: any, index: number) => {
                const name = typeof step === 'string' ? step : step.name || String(step);
                const cost = typeof step === 'object' && step.cost ? ` (₹${step.cost})` : '';
                const notes = typeof step === 'object' && step.notes ? ` — ${step.notes}` : '';
                return <div key={index}>{index + 1}. {name}{cost}{notes}</div>;
              })}
            </div>
          </>
        )}

        {/* ── TREATMENT DONE ── */}
        {prescriptionData.treatment_done && prescriptionData.treatment_done.length > 0 && (
          <>
            <p className="sec-heading">TREATMENT DONE</p>
            <div className="sec-body">
              {prescriptionData.treatment_done.map((item, index) => (
                <div key={index}>{index + 1}. {item.description}</div>
              ))}
            </div>
          </>
        )}

        {/* ── ADVICE / INSTRUCTIONS ── */}
        {prescriptionData.advice && (
          <>
            <p className="sec-heading">ADVICE / INSTRUCTIONS</p>
            <p className="sec-body">{prescriptionData.advice}</p>
          </>
        )}

        {/* ── MEDICATIONS ── */}
        {prescriptionData.medicines && prescriptionData.medicines.length > 0 && (
          <>
            <p className="sec-heading">MEDICATIONS</p>
            <table className="med-table">
              <thead>
                <tr>
                  <th style={{ width: '6%', textAlign: 'center' }}>S.No</th>
                  <th style={{ width: '44%' }}>Medication</th>
                  <th style={{ width: '25%' }}>Dosage</th>
                  <th style={{ width: '25%' }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {prescriptionData.medicines.map((medicine, index) => (
                  <tr key={index}>
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td>{medicine.name}</td>
                    <td>{medicine.dosage || '—'}</td>
                    <td>{medicine.duration || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* ── Signature Area (two-column like hospital docs) ── */}
        <div className="sig-row">
          <div className="sig-block" style={{ textAlign: 'left' }}>
            <div className="sig-line">&nbsp;</div>
          </div>
          <div className="sig-block" style={{ textAlign: 'center' }}>
            <Image
              src={`/${signatureParam}`}
              alt="Doctor's Signature"
              width={120}
              height={60}
              style={{ objectFit: 'contain', marginBottom: '4px' }}
            />
            <div className="sig-label">{doctorNameParam}</div>
            <div className="sig-title">Consultant</div>
          </div>
        </div>

      </div>

      {/* Print / Close buttons (screen only) */}
      <div className="no-print" style={{ textAlign: 'center', padding: '20px' }}>
        <button
          onClick={() => window.print()}
          style={{
            padding: '12px 24px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Print Prescription
        </button>
        <button
          onClick={() => window.close()}
          style={{
            padding: '12px 24px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Close
        </button>
      </div>
    </>
  );
}

export default function PrintPrescriptionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-900">Loading...</p>
        </div>
      </div>
    }>
      <PrintPrescriptionContent />
    </Suspense>
  );
}
