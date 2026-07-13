import { supabase } from "@/lib/supabase";
import type { TablesUpdate } from "@/lib/database.types";

export type ProfileEditable = Pick<
  TablesUpdate<"profiles">,
  "full_name" | "phone" | "locale" | "native_language" | "avatar_url"
>;

/** Update the current user's own profile. RLS + a trigger keep role/org/status safe. */
export async function updateMyProfile(id: string, patch: ProfileEditable) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  if (error) throw error;
}

/** Look up an organization's display name (used on the profile page). */
export async function getOrganizationName(orgId: string): Promise<string | null> {
  const { data, error } = await supabase.from("organizations").select("name").eq("id", orgId).maybeSingle();
  if (error) throw error;
  return data?.name ?? null;
}
