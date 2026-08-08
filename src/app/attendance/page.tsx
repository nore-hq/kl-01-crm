'use client';

import { useState, useEffect } from 'react';
import { getDailyAttendance, saveAttendanceRecord, recordSalaryAdvance } from '@/app/actions/attendance';
import { Check, Plus } from 'lucide-react';

export default function AttendancePage() {
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [records, setRecords] = useState<any[]>([]);

    // New state to track unsubmitted changes locally
    const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [advanceModalEmp, setAdvanceModalEmp] = useState<any | null>(null);
    const [advanceAmount, setAdvanceAmount] = useState<string>('');

    const loadData = async () => {
        const data = await getDailyAttendance(selectedDate);
        setRecords(data);
        setPendingChanges({}); // Clear any unsaved changes when changing dates
    };

    useEffect(() => {
        loadData();
    }, [selectedDate]);

    // Helper to merge database state with local unsaved state
    const getAttendanceState = (employeeId: string, dbAttendance: any) => {
        return pendingChanges[employeeId] || dbAttendance || { status: 'UNMARKED', isLate: false, overtimeHours: 0 };
    };

    // Update local state instead of immediately hitting the DB
    const handleLocalChange = (employeeId: string, field: string, value: any, dbAttendance: any) => {
        setPendingChanges((prev) => ({
            ...prev,
            [employeeId]: {
                ...getAttendanceState(employeeId, dbAttendance),
                [field]: value
            }
        }));
    };

    // Master Submit Function
    const handleEndOfDaySubmit = async () => {
        if (Object.keys(pendingChanges).length === 0) return;

        setIsSubmitting(true);
        try {
            const promises = Object.entries(pendingChanges).map(([employeeId, data]) =>
                saveAttendanceRecord({
                    employeeId,
                    date: selectedDate,
                    ...data
                })
            );

            // Execute all updates concurrently
            await Promise.all(promises);
            await loadData();
        } catch (error) {
            console.error("Failed to save attendance:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAdvanceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!advanceModalEmp || !advanceAmount) return;

        await recordSalaryAdvance({
            employeeId: advanceModalEmp.id,
            amount: parseFloat(advanceAmount),
            datePaid: selectedDate,
        });

        setAdvanceModalEmp(null);
        setAdvanceAmount('');
        loadData();
    };

    const hasUnsavedChanges = Object.keys(pendingChanges).length > 0;

    return (
        <div className="space-y-8">
            {/* Header & Date Selector */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-2">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Daily HR & Attendance</h1>
                    <p className="text-sm text-gray-500 mt-1">Mark daily present status, late arrivals, overtime, and advances.</p>
                </div>

                <div className="flex items-end gap-4">
                    <div className="flex flex-col">
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#143d30]/20 shadow-sm"
                        />
                    </div>

                    <button
                        onClick={handleEndOfDaySubmit}
                        disabled={!hasUnsavedChanges || isSubmitting}
                        className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-[0_8px_20px_rgba(20,61,48,0.15)] flex items-center gap-2 ${hasUnsavedChanges && !isSubmitting
                                ? 'bg-[#143d30] hover:bg-[#1a4f3f] text-white'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                            }`}
                    >
                        {isSubmitting ? 'Saving...' : <><Check className="w-4 h-4" /> Submit End of Day</>}
                    </button>
                </div>
            </div>

            {/* Attendance Matrix Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-[4px_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-900">
                        <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="p-5">Staff Name</th>
                                <th className="p-5">Daily Rate</th>
                                <th className="p-5 min-w-[240px]">Attendance Status</th>
                                <th className="p-5">Punctuality</th>
                                <th className="p-5">Overtime (Hrs)</th>
                                <th className="p-5">Advance Cash</th>
                                <th className="p-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {records.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">
                                        No active staff found. Please register employees first.
                                    </td>
                                </tr>
                            ) : (
                                records.map(({ employee, attendance, advancePaidToday }) => {
                                    // Use local state if it exists, otherwise use DB state
                                    const currentState = getAttendanceState(employee.id, attendance);
                                    const { status, isLate, overtimeHours: overtime } = currentState;

                                    return (
                                        <tr key={employee.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-5">
                                                <div className="font-semibold text-gray-900">{employee.name}</div>
                                                <div className="text-xs text-gray-500 mt-0.5">{employee.position}</div>
                                            </td>
                                            <td className="p-5 font-medium text-gray-600">₹{employee.dailyRate}</td>
                                            <td className="p-5">
                                                <div className="flex items-center gap-2 bg-gray-100/50 p-1 rounded-lg w-max border border-gray-200/50">
                                                    <button
                                                        onClick={() => handleLocalChange(employee.id, 'status', 'PRESENT', attendance)}
                                                        className={`px-3 py-1.5 text-xs rounded-md transition-all ${status === 'PRESENT' ? 'bg-[#143d30] text-white shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
                                                    >
                                                        Present
                                                    </button>
                                                    <button
                                                        onClick={() => handleLocalChange(employee.id, 'status', 'HALF_DAY', attendance)}
                                                        className={`px-3 py-1.5 text-xs rounded-md transition-all ${status === 'HALF_DAY' ? 'bg-amber-500 text-white shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
                                                    >
                                                        Half Day
                                                    </button>
                                                    <button
                                                        onClick={() => handleLocalChange(employee.id, 'status', 'ABSENT', attendance)}
                                                        className={`px-3 py-1.5 text-xs rounded-md transition-all ${status === 'ABSENT' ? 'bg-rose-500 text-white shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
                                                    >
                                                        Absent
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <button
                                                    onClick={() => handleLocalChange(employee.id, 'isLate', !isLate, attendance)}
                                                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${isLate ? 'bg-amber-50 border-amber-200 text-amber-700 font-semibold' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                                >
                                                    {isLate ? 'Late Arrival' : 'On Time'}
                                                </button>
                                            </td>
                                            <td className="p-5">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    value={overtime}
                                                    onChange={(e) => handleLocalChange(employee.id, 'overtimeHours', parseFloat(e.target.value) || 0, attendance)}
                                                    className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-center text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#143d30]/20"
                                                />
                                            </td>
                                            <td className="p-5">
                                                {advancePaidToday > 0 ? (
                                                    <span className="inline-flex items-center gap-1 bg-[#E2F898]/30 text-[#143d30] px-2.5 py-1 rounded-md text-xs font-bold border border-[#E2F898]">
                                                        ₹{advancePaidToday}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="p-5 text-right">
                                                <button
                                                    onClick={() => setAdvanceModalEmp(employee)}
                                                    className="text-sm font-semibold text-[#143d30] hover:text-[#1a4f3f] bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5"
                                                >
                                                    <Plus className="w-4 h-4" /> Advance
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Advance Salary Cash Modal (Light Theme) */}
            {advanceModalEmp && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm shadow-[0_24px_80px_rgba(0,0,0,0.12)] animate-scale-in">
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Record Cash Advance</h2>
                        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                            Issue advance payment for <span className="font-semibold text-gray-900">{advanceModalEmp.name}</span> on {selectedDate}.
                        </p>

                        <form onSubmit={handleAdvanceSubmit} className="mt-6 space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Advance Amount (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={advanceAmount}
                                    onChange={(e) => setAdvanceAmount(e.target.value)}
                                    placeholder="e.g. 500"
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#143d30]/20 placeholder-gray-400"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setAdvanceModalEmp(null)}
                                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-[#143d30] hover:bg-[#1a4f3f] text-white font-semibold px-5 py-2 rounded-xl text-sm transition-all shadow-[0_4px_12px_rgba(20,61,48,0.2)]"
                                >
                                    Confirm Payout
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}