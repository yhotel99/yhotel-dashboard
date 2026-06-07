import { createClient } from "@/lib/supabase/server";
import type { Branch, BranchInput } from "@/lib/types";

export async function listBranches(): Promise<Branch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("*")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as Branch[];
}

export async function getBranchById(id: string): Promise<Branch | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    return null;
  }
  return data as Branch;
}

export async function createBranch(input: BranchInput): Promise<Branch> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .insert({
      code: input.code.trim().toLowerCase(),
      name: input.name,
      address: input.address ?? null,
      phone: input.phone ?? null,
      image_url: input.image_url ?? null,
      is_active: input.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // qr_display_state row is created when the first booking is sent to the QR screen
  // (upsert_qr_display_state requires a valid booking on this branch).

  return data as Branch;
}

export async function updateBranch(
  id: string,
  input: Partial<BranchInput>
): Promise<Branch> {
  const supabase = await createClient();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.code !== undefined) payload.code = input.code.trim().toLowerCase();
  if (input.name !== undefined) payload.name = input.name;
  if (input.address !== undefined) payload.address = input.address;
  if (input.phone !== undefined) payload.phone = input.phone;
  if (input.image_url !== undefined) payload.image_url = input.image_url;
  if (input.is_active !== undefined) payload.is_active = input.is_active;

  const { data, error } = await supabase
    .from("branches")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as Branch;
}

export async function softDeleteBranch(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("branches")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
