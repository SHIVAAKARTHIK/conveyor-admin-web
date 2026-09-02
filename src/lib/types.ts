// Mirrors backend/app/schemas.py and backend/app/models.py

export type UserRole = "admin" | "doctor" | "nurse" | "pharmacist" | "technician" | "patient";

export type PrescriptionStatus = "pending" | "verified" | "dispatched" | "delivered" | "failed";

export type DeliveryStatus = "preparing" | "verifying" | "in_transit" | "arrived" | "confirmed" | "failed";

export type MotorStatus = "idle" | "running" | "jammed" | "failed";

export type AlertType = "medicine_mismatch" | "conveyor_jam" | "motor_failure";

export type AlertStatus = "open" | "acknowledged" | "resolved";

export type ConsultationStatus = "requested" | "accepted" | "completed";

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  user_id: string;
  name: string;
}

export interface UserOut {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  department: string | null;
  is_available: boolean;
  created_at: string;
}

export interface PatientOut {
  id: string;
  name: string;
  age: number;
  gender: string;
  bed_no: string;
  qr_code: string;
  medical_history_notes: string | null;
  has_account: boolean;
  created_at: string;
}

export interface MedicineOut {
  id: string;
  name: string;
  dosage: string;
  form: string;
  qty: number;
  medicine_code: string;
}

export interface PrescriptionOut {
  id: string;
  patient_id: string;
  doctor_id: string;
  notes: string | null;
  status: PrescriptionStatus;
  created_at: string;
  medicines: MedicineOut[];
}

export interface DeliveryOut {
  id: string;
  prescription_id: string;
  status: DeliveryStatus;
  bed_no: string | null;
  verified_by: string | null;
  confirmed_by: string | null;
  prepared_at: string | null;
  verified_at: string | null;
  dispatched_at: string | null;
  arrived_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  patient_name: string | null;
  patient_bed_no: string | null;
  medicines: MedicineOut[];
}

export interface ConsultationOut {
  id: string;
  patient_id: string;
  doctor_id: string;
  complaint: string;
  status: ConsultationStatus;
  created_at: string;
  accepted_at: string | null;
  patient_name: string | null;
  patient_bed_no: string | null;
  doctor_name: string | null;
}

export interface ConveyorStatusOut {
  id: string;
  motor_status: MotorStatus;
  position: string | null;
  speed: number;
  last_jam_at: string | null;
  updated_at: string;
}

export interface AlertOut {
  id: string;
  type: AlertType;
  message: string;
  related_delivery_id: string | null;
  status: AlertStatus;
  target_role: UserRole;
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface ReportSummary {
  deliveries_per_day: { day: string; count: number }[];
  avg_delivery_seconds: number | null;
  alert_counts_by_type: Record<string, number>;
  open_alerts: number;
  total_deliveries: number;
}
