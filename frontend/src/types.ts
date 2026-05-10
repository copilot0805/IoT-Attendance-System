export type Role = "ADMIN" | "EMPLOYEE";

export interface User {
  user_id: string;
  full_name: string;
  email: string;
  role: Role;
}

export interface Shift {
  shift_id: string;
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

export interface RosterItem {
  user_id: string;
  full_name: string;
  working_date: string;
  shift_id: string;
  start_time: string;
  end_time: string;
}

export interface TimesheetItem {
  user_id: string;
  full_name: string;
  start_time: string;
  end_time: string;
  status: string;
  working_hours: number;
  check_in: string | null;
  check_out: string | null;
}

export interface AttendanceLogItem {
  full_name: string;
  event_type: "CHECK_IN" | "CHECK_OUT";
  event_time: string;
  imgurl: string | null;
}
