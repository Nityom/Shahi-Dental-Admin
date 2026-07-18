'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Phone, Stethoscope, Pencil, Trash2, Search, X } from 'lucide-react';

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

const normalizeAppointmentTime = (time: string) => {
  const trimmedTime = time.trim();

  if (!trimmedTime) return trimmedTime;

  const timeMatch = trimmedTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!timeMatch) return trimmedTime;

  let hours = Number(timeMatch[1]);
  const minutes = timeMatch[2];
  const meridiem = timeMatch[3].toUpperCase();

  if (meridiem === 'AM') {
    if (hours === 12) hours = 0;
  } else if (hours !== 12) {
    hours += 12;
  }

  return `${String(hours).padStart(2, '0')}:${minutes}`;
};

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"appointments"> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Calendar State
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    time: '11:00',
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
    return allAppointments
      .filter(
        (a): a is (typeof a & { date: string; time: string }) =>
          typeof a.date === 'string' && typeof a.time === 'string',
      )
      .filter(a => a.date === selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [allAppointments, selectedDate]);

  const appointmentsByDate = useMemo(() => {
    if (!allAppointments) return {};
    const acc: Record<string, number> = {};
    for (const a of allAppointments) {
      if (typeof a.date !== 'string') continue;
      acc[a.date] = (acc[a.date] || 0) + 1;
    }
    return acc;
  }, [allAppointments]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !allAppointments) return [];
    const q = searchQuery.toLowerCase().trim();
    return allAppointments
      .filter(a =>
        (typeof a.name === 'string' && a.name.toLowerCase().includes(q)) ||
        (typeof a.phone === 'string' && a.phone.includes(q))
      )
      .sort((a, b) => {
        const da = typeof a.date === 'string' ? a.date : '';
        const db = typeof b.date === 'string' ? b.date : '';
        return db.localeCompare(da); // newest first
      })
      .slice(0, 20);
  }, [searchQuery, allAppointments]);

  const createAppointment = useMutation(api.appointments.create);
  const updateAppointment = useMutation(api.appointments.update);
  const removeAppointment = useMutation(api.appointments.remove);

  const handleOpenModal = (appt?: any) => {
    if (appt) {
      setEditingId(appt._id);
      setFormData({
        name: appt.name,
        phone: appt.phone,
        time: appt.time,
        doctor_name: appt.doctor_name || 'Dr. Kautilya Swaroop',
        duration_minutes: appt.duration_minutes || 30,
        dental_problem: appt.dental_problem || '',
        notes: appt.notes || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        phone: '',
        time: '11:00',
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
      const appointmentPayload = {
        name: formData.name,
        phone: formData.phone,
        date: selectedDate,
        time: normalizeAppointmentTime(formData.time),
        doctor_name: formData.doctor_name,
        duration_minutes: formData.duration_minutes,
        dental_problem: formData.dental_problem || undefined,
        notes: formData.notes || undefined,
      };

      if (editingId) {
        await updateAppointment({ id: editingId, ...appointmentPayload });
      } else {
        await createAppointment(appointmentPayload);
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
    
    const weekDaysMobile = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={`header-${i}`} className="font-semibold text-center text-gray-500 py-2 uppercase tracking-wider">
          <span className="hidden sm:inline text-sm">{weekDays[i]}</span>
          <span className="sm:hidden text-xs">{weekDaysMobile[i]}</span>
        </div>
      );
    }

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="border border-gray-100 bg-gray-50/50 min-h-[48px] sm:min-h-[100px]"></div>);
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
          className={`relative p-1 sm:p-2 border border-gray-100 min-h-[48px] sm:min-h-[100px] cursor-pointer transition-colors group flex flex-col items-center pt-2 sm:pt-3 hover:bg-blue-50
            ${isSelected ? 'bg-blue-50/80 border-blue-200' : 'bg-white'}`}
        >
          <span className={`w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xs sm:text-sm font-medium mb-0.5 sm:mb-1
            ${isSelected ? 'bg-blue-600 text-white shadow-md' : isToday ? 'bg-blue-100 text-blue-800' : 'text-gray-700 group-hover:text-blue-600'}`}>
            {i}
          </span>
          {count > 0 && (
            <div className="flex gap-1 mt-0.5 justify-center flex-wrap">
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                {count} {count === 1 ? 'Appt' : 'Appts'}
              </span>
              <span className="sm:hidden w-1.5 h-1.5 rounded-full bg-green-500"></span>
            </div>
          )}
        </div>
      );
    }

    const totalSlots = startDay + daysInMonth;
    const paddingSlots = totalSlots % 7 === 0 ? 0 : 7 - (totalSlots % 7);
    for (let i = 0; i < paddingSlots; i++) {
      days.push(<div key={`padding-${i}`} className="border border-gray-100 bg-gray-50/50 min-h-[48px] sm:min-h-[100px]"></div>);
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
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col max-h-[500px] lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] overflow-hidden">
          {/* Panel header */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
            {isSearchOpen ? (
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name or phone…"
                  className="flex-1 text-sm outline-none text-gray-800 placeholder-gray-400 bg-transparent"
                />
                <button
                  onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                  className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-0.5">Schedule</p>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900 leading-tight">{formatDateForDisplay(selectedDate)}</h3>
                    {appointmentsForDate && appointmentsForDate.length > 0 && (
                      <span className="text-xs font-bold bg-blue-600 text-white rounded-full px-2 py-0.5">{appointmentsForDate.length}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition shrink-0 mt-1"
                  title="Search appointments"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1">
            {/* Search results mode */}
            {isSearchOpen && searchQuery.trim() ? (
              searchResults.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <Search className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm">No appointments found</p>
                </div>
              ) : (
                searchResults.map((appt, index) => {
                  const initials = (appt.name || '?').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
                  const avatarColors = ['bg-blue-100 text-blue-700','bg-violet-100 text-violet-700','bg-emerald-100 text-emerald-700','bg-amber-100 text-amber-700','bg-rose-100 text-rose-700','bg-cyan-100 text-cyan-700'];
                  const color = avatarColors[index % avatarColors.length];
                  return (
                    <button
                      key={appt._id}
                      onClick={() => {
                        if (typeof appt.date === 'string') {
                          setSelectedDate(appt.date);
                          const d = new Date(appt.date);
                          setCurrentMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
                        }
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition text-left w-full"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${color}`}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm truncate">{appt.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            {typeof appt.date === 'string' ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(appt.date)) : '—'}
                          </span>
                          {typeof appt.time === 'string' && (
                            <span className="text-xs text-blue-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" />{appt.time}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )
            ) : isSearchOpen ? (
              <div className="py-10 text-center text-gray-400">
                <Search className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">Start typing to search</p>
              </div>
            ) : appointmentsForDate === undefined ? (
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
              appointmentsForDate.map((appt, index) => {
                const initials = (appt.name || '?').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
                const avatarColors = [
                  'bg-blue-100 text-blue-700',
                  'bg-violet-100 text-violet-700',
                  'bg-emerald-100 text-emerald-700',
                  'bg-amber-100 text-amber-700',
                  'bg-rose-100 text-rose-700',
                  'bg-cyan-100 text-cyan-700',
                ];
                const accentColors = ['border-blue-400', 'border-violet-400', 'border-emerald-400', 'border-amber-400', 'border-rose-400', 'border-cyan-400'];
                const color = avatarColors[index % avatarColors.length];
                const accent = accentColors[index % accentColors.length];

                return (
                  <div key={appt._id} className={`rounded-xl bg-white border border-gray-100 shadow-sm border-l-4 ${accent} hover:shadow-md transition-all group`}>
                    {/* Top row: time + actions */}
                    <div className="flex items-center justify-between px-4 pt-3 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-sm font-bold text-blue-600 tracking-tight">{appt.time}</span>
                        {appt.duration_minutes && (
                          <span className="text-xs text-gray-400 font-medium">· {appt.duration_minutes}min</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenModal(appt)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(appt._id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Patient info */}
                    <div className="flex items-center gap-3 px-4 pb-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${color}`}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{appt.name}</p>
                        <a href={`tel:${appt.phone}`} className="text-xs text-gray-500 hover:text-blue-600 transition flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />{appt.phone}
                        </a>
                      </div>
                    </div>

                    {/* Dental problem tag */}
                    {appt.dental_problem && (
                      <div className="px-4 pb-3">
                        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">
                          <Stethoscope className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[180px]">{appt.dental_problem}</span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
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
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone</label>
                  <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Time</label>
                  <input required type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition" />
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
