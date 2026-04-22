import { z } from 'zod';

// ---- Auth ----
export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().email('Enter a valid email'),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ---- Activity request ----
export const activityRequestSchema = z.object({
  activity_id: z.string().uuid(),
  start_date: z.string().min(1, 'Start date required'),
  end_date: z.string().min(1, 'End date required'),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(512),
  proof_url: z.string().optional(),
});
export type ActivityRequestInput = z.infer<typeof activityRequestSchema>;

// ---- Attendance edit ----
export const editAttendanceSchema = z.object({
  status: z.enum(['present', 'absent', 'activity', 'leave']),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(256),
});
export type EditAttendanceInput = z.infer<typeof editAttendanceSchema>;

// ---- CSV Import ----
export const csvImportSchema = z.object({
  file: z.instanceof(File, { message: 'CSV file required' }),
});
