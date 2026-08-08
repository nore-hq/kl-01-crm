'use server';

import { attendance, salaryAdvances, employees } from '@/db/schema';
import { eq, like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { getRequestContext } from '@cloudflare/next-on-pages';

function getEdgeDb() {
    const ctx = getRequestContext();
    const env = ctx?.env as any;
    const dbBinding = env?.DB || (process.env as any).DB || (globalThis as any).__env__?.DB;
    if (!dbBinding) throw new Error("CRITICAL: Cloudflare DB binding not found.");
    return drizzle(dbBinding);
}

export async function getMonthlySalaryReport(monthPrefix: string) {
    try {
        const db = getEdgeDb();
        const activeStaff = await db.select().from(employees).where(eq(employees.status, 'ACTIVE'));
        const monthlyAttendance = await db.select().from(attendance).where(like(attendance.date, `${monthPrefix}-%`));
        const monthlyAdvances = await db.select().from(salaryAdvances).where(like(salaryAdvances.datePaid, `${monthPrefix}-%`));

        return activeStaff.map((emp) => {
            const empAttendance = monthlyAttendance.filter((a) => a.employeeId === emp.id);
            const empAdvances = monthlyAdvances.filter((a) => a.employeeId === emp.id);

            const daysPresent = empAttendance.filter(a => a.status === 'PRESENT').length;
            const halfDays = empAttendance.filter(a => a.status === 'HALF_DAY').length;
            const totalOvertimeHours = empAttendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
            const totalAdvances = empAdvances.reduce((sum, a) => sum + a.amount, 0);

            const hourlyRate = emp.dailySalary / 8;
            const overtimePay = totalOvertimeHours * hourlyRate;
            const basePay = (daysPresent * emp.dailySalary) + (halfDays * (emp.dailySalary / 2));
            const grossPay = basePay + overtimePay;
            const netPay = grossPay - totalAdvances;

            return { employee: emp, stats: { daysPresent, halfDays, totalOvertimeHours, basePay, overtimePay, totalAdvances, grossPay, netPay } };
        });
    } catch (err) {
        return [];
    }
}