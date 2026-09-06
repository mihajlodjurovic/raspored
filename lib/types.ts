export type Role = "admin" | "employee";

export type Applicant = {
  id: string;
  username: string; // which user applied (employee account username)
  name: string;
  surname: string;
  phone: string;
  appliedAt: string;
};

export type ScheduleEntryType = "shift" | "freeDay";

export type Shift = {
  id: string;
  type: ScheduleEntryType;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  needed: number; // how many workers can apply (workers needed for a shift, workers allowed to take a free day)
  applicants: Applicant[];
};

export type SessionPayload = {
  username: string;
  role: Role;
  expiresAt: string;
};

export type User = {
  id: string;
  username: string;
  role: Role;
  name: string;
  surname: string;
  phone: string;
  createdAt: string;
  redPoints: number; // number of active warnings
};

export type Warning = {
  id: string;
  username: string;
  shiftId: string;
  shiftDate: string;
  createdAt: string;
};