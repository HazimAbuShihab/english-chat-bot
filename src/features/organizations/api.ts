import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert } from "@/lib/database.types";

export async function getOrganizations(): Promise<Tables<"organizations">[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createOrganization(input: TablesInsert<"organizations">) {
  const { data, error } = await supabase.from("organizations").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateOrganization(id: string, patch: Partial<TablesInsert<"organizations">>) {
  const { error } = await supabase.from("organizations").update(patch).eq("id", id);
  if (error) throw error;
}

export interface PlatformUser extends Tables<"profiles"> {
  organization: { name: string } | null;
}

export async function getAllUsers(): Promise<PlatformUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, organization:organizations(name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as any[]).map((u) => ({
    ...u,
    organization: Array.isArray(u.organization) ? u.organization[0] ?? null : u.organization,
  })) as PlatformUser[];
}
