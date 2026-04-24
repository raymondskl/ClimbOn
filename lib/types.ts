export type TxType = "income" | "expense";

export interface Transaction {
  id: number;
  occurred_on: string;
  type: TxType;
  category: string;
  amount: number;
  description: string | null;
  project_id: number | null;
  created_at: string;
}

export type ProjectStatus = "planned" | "active" | "on_hold" | "completed" | "cancelled";

export interface Project {
  id: number;
  name: string;
  client: string | null;
  status: ProjectStatus;
  budget: number;
  start_date: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
}

export type LeadStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

export interface Lead {
  id: number;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  stage: LeadStage;
  estimated_value: number;
  next_action: string | null;
  next_action_date: string | null;
  notes: string | null;
  created_at: string;
}

export type EmploymentType = "full_time" | "part_time" | "contractor";

export interface Employee {
  id: number;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  employment_type: EmploymentType;
  salary: number;
  start_date: string | null;
  active: number;
  notes: string | null;
  created_at: string;
}

export interface Dataset {
  id: number;
  name: string;
  description: string | null;
  date_column: string;
  value_column: string;
  created_at: string;
}

export interface DatasetRow {
  id: number;
  dataset_id: number;
  point_date: string;
  value: number;
  meta: string | null;
}
