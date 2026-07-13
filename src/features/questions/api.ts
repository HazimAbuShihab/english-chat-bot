import { supabase } from "@/lib/supabase";
import type { Enums, Tables, TablesInsert } from "@/lib/database.types";

export interface QuestionWithCategory extends Tables<"questions"> {
  category: { id: string; name: string; color: string | null } | null;
}

export interface QuestionFilters {
  search?: string;
  cefr?: Enums<"cefr_level"> | "all";
  difficulty?: Enums<"difficulty_level"> | "all";
  categoryId?: string | "all";
  activeOnly?: boolean;
}

export async function listQuestions(filters: QuestionFilters = {}): Promise<QuestionWithCategory[]> {
  let query = supabase
    .from("questions")
    .select("*, category:categories(id, name, color)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filters.search) query = query.ilike("title", `%${filters.search}%`);
  if (filters.cefr && filters.cefr !== "all") query = query.eq("cefr_level", filters.cefr);
  if (filters.difficulty && filters.difficulty !== "all") query = query.eq("difficulty", filters.difficulty);
  if (filters.categoryId && filters.categoryId !== "all") query = query.eq("category_id", filters.categoryId);
  if (filters.activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as any[]).map((q) => ({
    ...q,
    category: Array.isArray(q.category) ? q.category[0] ?? null : q.category,
  })) as QuestionWithCategory[];
}

export async function listCategories(): Promise<Tables<"categories">[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createQuestion(input: TablesInsert<"questions">) {
  const { data, error } = await supabase.from("questions").insert(input).select("id").single();
  if (error) throw error;
  return data;
}

export async function updateQuestion(id: string, patch: Partial<TablesInsert<"questions">>) {
  const { error } = await supabase.from("questions").update(patch).eq("id", id);
  if (error) throw error;
}

/** Soft delete keeps history and any exam references intact. */
export async function softDeleteQuestion(id: string) {
  const { error } = await supabase
    .from("questions")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id);
  if (error) throw error;
}
