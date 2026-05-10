// Domain type definitions usable from JS via JSDoc references:
//   /** @type {import("./types/domain").Department} */
//
// Once the project migrates to TypeScript, rename .js → .ts/.tsx, drop the
// JSDoc, and import these types directly.

export type DepartmentTeam =
  | "Programs"
  | "Membership"
  | "Districts"
  | "Ministry"
  | "Mission"
  | "Maturity"
  | "General Service"
  | "Interactive Groups"
  | "Next Gen"
  | "NLP"
  | "Senior Leadership"
  | string; // accept arbitrary new teams

export interface Department {
  id: number;
  name: string;
  team: DepartmentTeam;
  route: string | null;
  isactive: boolean;
  code?: string;
}

export type WorkerStatus = "ACTIVE" | "PENDING_ADD" | "PENDING_DELETE" | null;

export interface Worker {
  id: number;
  identifier: string | null;
  firstname: string;
  lastname: string;
  othername: string;
  fullname: string;
  fullnamereverse: string;
  email: string;
  phonenumber: string;
  department: string;
  team: DepartmentTeam;
  workerrole: string;
  birthdate: string | null;
  agerange: string | null;
  gender: "Male" | "Female" | null;
  address: string | null;
  maritalstatus: "Single" | "Married" | "" | null;
  employment: string | null;
  occupation: string | null;
  status: WorkerStatus;
  isactive: boolean | null;
  createdat: string | null;
  updatedat: string | null;
  approvedat: string | null;
}

export type PermissionLevel =
  | "SUPER_ADMIN"
  | "CHURCH_ADMIN"
  | "TEAM_ADMIN"
  | "SUB_TEAM_ADMIN"
  | "HOD";

export interface AuthUser {
  id: number;
  email?: string;
  department: string;
  team: string;
  route: string;
  permissions: string[];
  permissionLevel?: PermissionLevel;
  role: string;
  code: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data: T;
  error?: string;
}
