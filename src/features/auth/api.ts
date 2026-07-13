import { supabase } from "@/lib/supabase";

/** Sign in with email + password. */
export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/** Send a password-reset email. The link returns to /reset-password. */
export async function sendPasswordReset(email: string) {
  const redirectTo = `${window.location.origin}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

/** Update the password for the currently authenticated (recovery) session. */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * Student sign-up / login via an exam or invitation code.
 *
 * The code maps to an exam `join_code`. A pre-existing invitation (created by an
 * admin) governs the resulting role/organization via the handle_new_user
 * trigger, so codes cannot be used to self-escalate privileges.
 */
export async function signUpWithInvitation(params: {
  email: string;
  password: string;
  fullName: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: { full_name: params.fullName },
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });
  if (error) throw error;
  return data;
}

/** Look up an active exam by its join code (used on the student code screen). */
export async function findExamByJoinCode(code: string) {
  const { data, error } = await supabase
    .from("exams")
    .select("id, title, description, status, organization_id")
    .eq("join_code", code.trim().toUpperCase())
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data;
}
