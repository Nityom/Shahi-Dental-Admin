'use client';

import React from 'react';
import Link from 'next/link';
import { formatDate } from "@/lib/utils";
import { PrescriptionWithBill } from "@/types/prescription";
import { BillSummary } from "@/components/BillSummary";

interface PrescriptionHistoryProps {
  prescriptions: PrescriptionWithBill[];
  onDelete: (prescriptionId: string) => Promise<void>;
}

const PrescriptionHistory: React.FC<PrescriptionHistoryProps> = ({ prescriptions, onDelete }) => {
  return (
    <div>
      <h4 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Prescription History</h4>
      <div className="space-y-4 mt-4">
        {prescriptions
          .sort((a, b) => new Date(b.prescription_date).getTime() - new Date(a.prescription_date).getTime())
          .map((prescription, index) => (
            <div key={prescription.id || index} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 flex justify-between items-start">
                <div>
                  <h5 className="font-medium text-gray-800">Visit: {formatDate(prescription.prescription_date)}</h5>
                  <div className="text-sm text-gray-500 mt-1">
                    {prescription.followup_date ? (
                      <span className="inline-flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Follow-up: {formatDate(prescription.followup_date)}
                      </span>
                    ) : 'No follow-up scheduled'}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Link href={`/admin/prescription?edit=true&id=${prescription.id}&patientName=${encodeURIComponent(prescription.patient_name)}&age=${prescription.age}&sex=${prescription.sex}&phoneNumber=${encodeURIComponent(prescription.phone_number)}&chiefComplaint=${encodeURIComponent(prescription.chief_complaint || '')}&medicalHistory=${encodeURIComponent(prescription.medical_history || '')}&diagnosis=${encodeURIComponent(prescription.diagnosis || '')}&date=${prescription.prescription_date}&advice=${encodeURIComponent(prescription.advice || '')}&followupDate=${prescription.followup_date || ''}`}>
                    <button
                      type="button"
                      title="Edit Prescription"
                      className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </Link>
                  <button 
                    type="button"
                    title="Delete Prescription"
                    onClick={() => {
                      if (prescription.id && window.confirm('Are you sure you want to delete this prescription? This action cannot be undone.')) {
                        onDelete(prescription.id);
                      }
                    }}
                    className="inline-flex items-center justify-center w-8 h-8 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    {prescription.chief_complaint && (
                      <div>
                        <p className="text-sm font-semibold text-indigo-700">Chief Complaint:</p>
                        <p className="text-gray-700">{prescription.chief_complaint}</p>
                      </div>
                    )}
                    {prescription.diagnosis && (
                      <div>
                        <p className="text-sm font-semibold text-indigo-700">Diagnosis:</p>
                        <p className="text-gray-700">{prescription.diagnosis}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <BillSummary 
                      bill={prescription.bills?.[0]} 
                    />
                  </div>
                </div>
                {/* Oral Examination Details */}
                {(prescription.oral_exam_notes || (prescription.selected_teeth && prescription.selected_teeth.length > 0)) && (
                  <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
                    <h6 className="text-sm font-semibold text-indigo-800">Oral Examination:</h6>

                    {prescription.selected_teeth && prescription.selected_teeth.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-indigo-700">Selected Teeth:</p>
                        <p className="text-gray-700">
                          {prescription.selected_teeth.map((tooth: { id: number; type: string; category?: string; disease?: string; }) => 
                            tooth.category === 'General'
                              ? (tooth.disease || '')
                              : `#${tooth.id} (${tooth.type})${tooth.disease ? ` - ${tooth.disease}` : ''}`
                          ).join(', ')}
                        </p>
                      </div>
                    )}

                    {prescription.oral_exam_notes && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-indigo-700">Notes:</p>
                        <p className="text-gray-700">{prescription.oral_exam_notes}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Prescribed Medicines */}
                <div className="mb-3">
                  <h6 className="text-sm font-semibold text-gray-600 mb-2">Prescribed Medicines:</h6>
                  {prescription.medicines && prescription.medicines.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Medicine</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dosage</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {prescription.medicines.map((medicine: { name: string; dosage: string; duration: string; }, idx: number) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{medicine.name}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{medicine.dosage}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{medicine.duration}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No medicines prescribed</p>
                  )}
                </div>

                {/* Advice */}
                {prescription.advice && (
                  <div>
                    <h6 className="text-sm font-semibold text-gray-600 mb-2">Advice:</h6>
                    <p className="text-gray-800">{prescription.advice}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default PrescriptionHistory;
