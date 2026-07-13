import { supabase } from "@/lib/supabase";
import type { Enums } from "@/lib/database.types";

export interface OrgStats {
  students: number;
  exams: number;
  sessions_total: number;
  sessions_completed: number;
  average_score: number | null;
  pass_rate: number | null;
  cefr_distribution: Partial<Record<Enums<"cefr_level">, number>>;
}

export interface PlatformStats {
  organizations: number;
  users: number;
  students: number;
  exams: number;
  sessions: number;
  evaluations: number;
  audio_files: number;
  storage_bytes: number;
}

export async function getOrgStats(orgId: string): Promise<OrgStats> {
  const { data, error } = await supabase.rpc("org_dashboard_stats", { p_org: orgId });
  if (error) throw error;
  return data as unknown as OrgStats;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const { data, error } = await supabase.rpc("platform_stats");
  if (error) throw error;
  return data as unknown as PlatformStats;
}
