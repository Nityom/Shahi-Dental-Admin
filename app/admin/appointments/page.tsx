'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Phone, Stethoscope } from 'lucide-react';

// Helpers
const getTodayString = () => {
  const d = new Date();
  // Adjust for local timezone offset
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
};

const formatDateForDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  }).format(new Date(dateStr));
};

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"appointments"> | null>(null);
  
  // Calendar State
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    appointment_time: '11:00',
    doctor_name: 'Dr. Kautilya Swaroop',
    duration_minutes: 30,
    dental_problem: '',
    notes: '',
  });

  // Query all appointments for the whole month to show dots/indicators?
  // For simplicity, let's just query appointments for the selected date.
  // Wait, if we want to show dots on the calendar, we should query all appointments or a specific range.
  // We'll just fetch all appointments for now, assuming the list isn't huge, or we can just fetch list and filter.
  // Let's use the list query and filter it on the client side.
  const allAppointments = useQuery(api.appointments.list);
  const appointmentsForDate = useMemo(() => {
    if (!allAppointments) return undefined;
    return allAppointments.filter(a => a.appointment_date === selectedDate).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  }, [allAppointments, selectedDate]);

  const appointmentsByDate = useMemo(() => {
    if (!allAppointments) return {};
    const acc: Record<string, number> = {};
    for (const a of allAppointments) {
      acc[a.appointment_date] = (acc[a.appointment_date] || 0) + 1;
    }
    return acc;
  }, [allAppointments]);

  const createAppointment = useMutation(api.appointments.create);
  const updateAppointment = useMutation(api.appointments.update);
  const removeAppointment = useMutation(api.appointments.remove);

  const handleOpenModal = (appt?: any) => {
    if (appt) {
      setEditingId(appt._id);
      setFormData({
        full_name: appt.full_name,
        phone: appt.phone,
        appointment_time: appt.appointment_time,
        doctor_name: appt.doctor_name || 'Dr. Kautilya Swaroop',
        duration_minutes: appt.duration_minutes || 30,
        dental_problem: appt.dental_problem || '',
        notes: appt.notes || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        full_name: '',
        phone: '',
        appointment_time: '11:00',
        doctor_name: 'Dr. Kautilya Swaroop',
        duration_minutes: 30,
        dental_problem: '',
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateAppointment({ id: editingId, appointment_date: selectedDate, ...formData });
      } else {
        await createAppointment({ appointment_date: selectedDate, ...formData });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(`Error saving appointment: ${err.message}`);
    }
  };

  const handleDelete = async (id: Id<"appointments">) => {
    if (confirm("Are you sure you want to delete this appointment?")) {
      await removeAppointment({ id });
    }
  };

  // Calendar Helpers
  const nextMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));

  const startDay = currentMonthDate.getDay();
  const daysInMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate();
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentMonthDate);

  const renderCalendar = () => {
    const days = [];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
      days.push(<div key={`header-${i}`} className="font-semibold text-center text-sm text-gray-500 py-2 uppercase tracking-wider">{weekDays[i]}</div>);
    }

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-4 border border-gray-100 bg-gray-50/50 min-h-[100px]"></div>);
    }

    const todayStr = getTodayString();

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), i);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const dateString = new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
      
      const isSelected = dateString === selectedDate;
      const isToday = dateString === todayStr;
      const count = appointmentsByDate[dateString] || 0;

      days.push(
        <div 
          key={dateString} 
          onClick={() => setSelectedDate(dateString)}
          className={`relative p-2 border border-gray-100 min-h-[100px] cursor-pointer transition-colors group flex flex-col items-center pt-3 hover:bg-blue-50
            ${isSelected ? 'bg-blue-50/80 border-blue-200' : 'bg-white'}`}
        >
          <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium mb-1
            ${isSelected ? 'bg-blue-600 text-white shadow-md' : isToday ? 'bg-blue-100 text-blue-800' : 'text-gray-700 group-hover:text-blue-600'}`}>
            {i}
          </span>
          {count > 0 && (
            <div className="flex gap-1 mt-1 justify-center flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                {count} {count === 1 ? 'Appt' : 'Appts'}
              </span>
            </div>
          )}
        </div>
      );
    }

    const totalSlots = startDay + daysInMonth;
    const paddingSlots = totalSlots % 7 === 0 ? 0 : 7 - (totalSlots % 7);
    for (let i = 0; i < paddingSlots; i++) {
      days.push(<div key={`padding-${i}`} className="p-4 border border-gray-100 bg-gray-50/50 min-h-[100px]"></div>);
    }

    return (
      <div className="grid grid-cols-7 border-l border-t border-gray-100 rounded-xl overflow-hidden shadow-sm">
        {days}
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto mt-4 sm:mt-8 p-4 flex flex-col gap-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="w-8 h-8 text-blue-600" />
            Appointments
          </h2>
          <p className="text-gray-500 mt-1">Manage patient bookings and schedule</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition shadow-sm flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Appointment
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Calendar View */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-800">{monthName}</h3>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
              <button onClick={() => setCurrentMonthDate(new Date())} className="px-3 py-1 text-sm font-medium hover:bg-gray-100 rounded-lg text-gray-600 transition">Today</button>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
            </div>
          </div>
          {renderCalendar()}
        </div>

        {/* Selected Date Appointments list */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-[800px] overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-1 border-b pb-4 sticky top-0 bg-white z-10">
            {formatDateForDisplay(selectedDate)}
          </h3>

          <div className="mt-4 flex flex-col gap-3">
            {appointmentsForDate === undefined ? (
              <div className="py-10 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              </div>
            ) : appointmentsForDate.length === 0 ? (
              <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <CalendarIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>No appointments for this date.</p>
                <button onClick={() => handleOpenModal()} className="mt-4 text-blue-600 font-medium hover:underline text-sm">Create one now</button>
              </div>
            ) : (
              appointmentsForDate.map((appt) => (
                <div key={appt._id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md hover:border-blue-100 transition-all group relative">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-1.5 text-blue-700 font-semibold">
                      <Clock className="w-4 h-4" />
                      {appt.appointment_time}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenModal(appt)} className="text-sm text-blue-600 hover:text-blue-800">Edit</button>
                      <button onClick={() => handleDelete(appt._id)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-gray-800 font-medium">
                      <User className="w-4 h-4 text-gray-400" />
                      {appt.full_name}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {appt.phone}
                    </div>
                    {appt.dental_problem && (
                      <div className="flex flex-start gap-2 text-gray-600 text-sm mt-2 pt-2 border-t border-gray-200/60">
                        <Stethoscope className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{appt.dental_problem}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-7 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">{editingId ? 'Edit Appointment' : 'New Appointment'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                  <input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone</label>
                  <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Time</label>
                  <input required type="time" value={formData.appointment_time} onChange={e => setFormData({...formData, appointment_time: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Doctor</label>
                  <input type="text" value={formData.doctor_name} onChange={e => setFormData({...formData, doctor_name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Dental Problem</label>
                <input type="text" value={formData.dental_problem} onChange={e => setFormData({...formData, dental_problem: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition" placeholder="e.g. Checkup, Toothache, Root Canal" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes</label>
                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition resize-none" rows={3}></textarea>
              </div>
              
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-sm transition">Save Appointment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
