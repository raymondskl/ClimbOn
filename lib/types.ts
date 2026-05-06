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

export interface LeadNote {
  id: number;
  lead_id: number;
  body: string;
  created_at: string;
  updated_at: string;
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

export interface Skill {
  id: number;
  name: string;
  created_at: string;
}

export interface EmployeeWithSkills extends Employee {
  skills: Skill[];
}

export interface Assignment {
  id: number;
  project_id: number;
  employee_id: number;
  start_date: string;
  end_date: string;
  role: string | null;
  notes: string | null;
  created_at: string;
}

export interface AssignmentDetail extends Assignment {
  employee_name: string;
  project_name: string;
}

export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";

export interface ProjectTask {
  id: number;
  project_id: number;
  description: string;
  required_skill_id: number | null;
  assigned_employee_id: number | null;
  status: TaskStatus;
  due_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface ProjectTaskDetail extends ProjectTask {
  required_skill_name: string | null;
  assigned_employee_name: string | null;
}

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined";

export interface Quote {
  id: number;
  project_id: number;
  version: number;
  quote_date: string | null;
  client_product: string | null;
  primary_contact: string | null;
  producer: string | null;
  producer_title: string | null;
  director: string | null;
  agency: string | null;
  agency_contact: string | null;
  production_company: string | null;
  prod_company_producer: string | null;
  tda_location: string | null;
  discount_rate: number;
  overhead_rate: number;
  cover_letter_intro: string | null;
  cover_letter_exclusions: string | null;
  licence_territory: string | null;
  licence_term: string | null;
  licence_use: string | null;
  status: QuoteStatus;
  created_at: string;
}

export interface QuoteItem {
  id: number;
  quote_id: number;
  sort_order: number;
  class: string;
  units: number;
  unit: string;
  resource_rate: number;
  overhead_rate: number;
  room_rate: number;
  quoted_rate_override: number | null;
  notes: string | null;
}

export type ShotDiscipline =
  | "design_mogfx"
  | "concept_art"
  | "anim_2d"
  | "dmp"
  | "dev"
  | "previz"
  | "layout"
  | "mod"
  | "rig"
  | "face_swap"
  | "anim"
  | "tex_shad"
  | "fx_td"
  | "lookdev"
  | "l_r"
  | "roto_track"
  | "lead_nuke"
  | "nuke"
  | "online"
  | "sound";

export interface QuoteShot {
  id: number;
  quote_id: number;
  sort_order: number;
  shot_code: string | null;
  board_ref: string | null;
  production_notes: string | null;
  vfx_notes: string | null;
  design_mogfx: number;
  concept_art: number;
  anim_2d: number;
  dmp: number;
  dev: number;
  previz: number;
  layout: number;
  mod: number;
  rig: number;
  face_swap: number;
  anim: number;
  tex_shad: number;
  fx_td: number;
  lookdev: number;
  l_r: number;
  roto_track: number;
  lead_nuke: number;
  nuke: number;
  online: number;
  sound: number;
}

export const SHOT_DISCIPLINES: { key: ShotDiscipline; label: string; lineClass: string }[] = [
  { key: "design_mogfx", label: "Design / Mo Gfx", lineClass: "DESIGN / MO GFX" },
  { key: "concept_art", label: "Concept Art", lineClass: "CONCEPT ART" },
  { key: "anim_2d", label: "2D Anim", lineClass: "2D ANIMATION" },
  { key: "dmp", label: "DMP", lineClass: "DMP" },
  { key: "dev", label: "Dev", lineClass: "DEV" },
  { key: "previz", label: "Previz", lineClass: "PREVIZ" },
  { key: "layout", label: "Layout", lineClass: "LAYOUT" },
  { key: "mod", label: "Mod", lineClass: "3D MODELLING" },
  { key: "rig", label: "Rig", lineClass: "RIG" },
  { key: "face_swap", label: "Face Swap", lineClass: "FACE SWAP" },
  { key: "anim", label: "Anim", lineClass: "ANIMATION" },
  { key: "tex_shad", label: "Tex / Shad", lineClass: "TEXTURE / SHADING" },
  { key: "fx_td", label: "FX TD", lineClass: "FX TD" },
  { key: "lookdev", label: "Lookdev", lineClass: "LOOKDEV" },
  { key: "l_r", label: "L&R", lineClass: "LIGHTING / RENDER" },
  { key: "roto_track", label: "Roto / Track", lineClass: "ROTOSCOPE" },
  { key: "lead_nuke", label: "Lead Nuke", lineClass: "LEAD NUKE COMP" },
  { key: "nuke", label: "Nuke", lineClass: "NUKE COMP" },
  { key: "online", label: "Online", lineClass: "ONLINE EDITING" },
  { key: "sound", label: "Sound", lineClass: "SOUND" },
];

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
