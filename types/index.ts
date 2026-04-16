export type Gender = "male" | "female" | "other";
export type RelationshipType =
  | "marriage"
  | "biological_child"
  | "adopted_child";
export type UserRole = "admin" | "editor" | "member" | "user";

export interface Profile {
  id: string;
  role: UserRole;
  is_active: boolean;
  phone_number?: string | null;
  phone_auth_expires_at?: string | null;
  full_name?: string | null;
  birth_year?: number | null;
  birth_month?: number | null;
  birth_day?: number | null;
  branch?: string | null;
  generation?: number | null;
  address?: string | null;
  profile_completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminUserData {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  full_name?: string | null;
  phone_number?: string | null;
}

export interface Person {
  id: string;
  full_name: string;
  gender: Gender;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  death_year: number | null;
  death_month: number | null;
  death_day: number | null;
  avatar_url: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;

  // Private fields (optional, as they might not be returned for members)
  phone_number?: string | null;
  occupation?: string | null;
  current_residence?: string | null;

  // New fields
  is_deceased: boolean;
  is_in_law: boolean;
  birth_order: number | null;
  generation: number | null;
  branch: string | null;
  other_names: string | null;
  birth_date_text: string | null;
  death_date_text: string | null;
}

export interface Relationship {
  id: string;
  type: RelationshipType;
  person_a: string; // UUID
  person_b: string; // UUID
  note?: string | null;
  created_at: string;
  updated_at: string;
}

// Helper types for UI
export interface PersonWithDetails extends Person {
  spouses?: Person[];
  children?: Person[];
  parents?: Person[];
}

export type AdditionalDataRequestStatus = "pending" | "approved" | "rejected";
export type RelationshipProposalDirection = "parent" | "child" | "spouse";

export interface RelationshipNewTargetProposal {
  full_name: string;
  gender: Gender;
  birth_year: number | null;
  birth_date_text: string | null;
  note: string | null;
  is_in_law: boolean;
}

export interface RelationshipAdditionProposal {
  target_person_id: string | null;
  target_person_name?: string;
  target_is_new?: boolean;
  target_new_person?: RelationshipNewTargetProposal | null;
  direction: RelationshipProposalDirection;
  relationship_type: RelationshipType;
  person_a: string | null;
  person_b: string | null;
  note: string | null;
}

export interface AdditionalDataRequestPayload {
  person_changes: Record<string, unknown>;
  private_changes: Record<string, unknown>;
  relationship_additions: RelationshipAdditionProposal[];
  submitter_note: string | null;
}

export interface AdditionalDataRequestItem {
  id: string;
  person_id: string;
  person_generation?: number | null;
  person_branch?: string | null;
  submitted_by: string;
  status: AdditionalDataRequestStatus;
  request_payload: AdditionalDataRequestPayload;
  before_snapshot: Record<string, unknown>;
  decision_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  person_name: string;
  submitter_name: string;
  reviewer_name?: string | null;
}

// Blog types
export type BlogPostStatus = "draft" | "review" | "published";

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  color: string;
  created_at: string;
}

export interface BlogTag {
  id: string;
  name: string;
  created_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  cover_image_url: string | null;
  status: BlogPostStatus;
  is_featured: boolean;
  author_id: string | null;
  published_at: string | null;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface BlogPostWithDetails extends BlogPost {
  categories: BlogCategory[];
  tags: BlogTag[];
  author: { id: string; email?: string } | null;
}
