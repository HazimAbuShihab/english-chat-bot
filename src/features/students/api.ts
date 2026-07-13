import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/database.types";

export async function listStudents(orgId: string): Promise<Tables<"profiles">[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", orgId)
    .eq("role", "student")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function randomToken(len = 40): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, len);
}

function randomCode(len = 8): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export interface InviteInput {
  orgId: string;
  email: string;
  role?: "student" | "org_admin";
  invitedBy: string;
  examId?: string | null;
}

/**
 * Create an invitation. The role/org it carries is applied automatically when
 * the invited person signs up (handle_new_user trigger), so invited users land
 * in the right organization with the right role.
 */
export async function createInvitation(input: InviteInput) {
  const { data, error } = await supabase
    .from("invitations")
    .insert({
      organization_id: input.orgId,
      email: input.email.trim().toLowerCase(),
      role: input.role ?? "student",
      token: randomToken(),
      code: randomCode(),
      invited_by: input.invitedBy,
      exam_id: input.examId ?? null,
      status: "pending",
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id, code, token")
    .single();
  if (error) throw error;
  return data;
}

export async function listInvitations(orgId: string): Promise<Tables<"invitations">[]> {
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
