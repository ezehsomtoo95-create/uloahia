"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { formatZodError } from "@/lib/validation/common";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const categoryInputSchema = z.object({
  id: z.string().uuid().optional(),
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().min(1).max(80).optional(),
  icon: z.string().trim().max(40).nullable().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  showCondition: z.boolean().optional(),
});

const attributeInputSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  fieldKey: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(80),
  fieldType: z.enum(["text", "number", "select", "boolean"]),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const locationNodeSchema = z.object({
  id: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().min(1).max(80).optional(),
  code: z.string().trim().max(8).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function adminUpsertCategory(input: z.infer<typeof categoryInputSchema>) {
  try {
    const parsed = categoryInputSchema.parse(input);
    const { supabase } = await requireAdmin();
    const slug = parsed.slug?.trim() || slugify(parsed.name);
    const payload = {
      parent_id: parsed.parentId ?? null,
      name: parsed.name,
      slug,
      icon: parsed.icon ?? null,
      is_featured: parsed.isFeatured ?? false,
      sort_order: parsed.sortOrder ?? 0,
      is_active: parsed.isActive ?? true,
      show_condition: parsed.showCondition ?? true,
    };

    const result = parsed.id
      ? await supabase.from("categories").update(payload).eq("id", parsed.id).select("id").single()
      : await supabase.from("categories").insert(payload).select("id").single();

    if (result.error) {
      return { ok: false as const, error: result.error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/browse");
    revalidatePath("/sell");
    return { ok: true as const, id: result.data.id as string };
  } catch (error) {
    return { ok: false as const, error: formatZodError(error) };
  }
}

export async function adminUpsertAttributeField(
  input: z.infer<typeof attributeInputSchema>,
) {
  try {
    const parsed = attributeInputSchema.parse(input);
    const { supabase } = await requireAdmin();
    const payload = {
      category_id: parsed.categoryId,
      field_key: slugify(parsed.fieldKey).replace(/-/g, "_") || parsed.fieldKey,
      label: parsed.label,
      field_type: parsed.fieldType,
      options: parsed.options ?? [],
      required: parsed.required ?? false,
      sort_order: parsed.sortOrder ?? 0,
      is_active: parsed.isActive ?? true,
    };

    const result = parsed.id
      ? await supabase
          .from("category_attribute_schemas")
          .update(payload)
          .eq("id", parsed.id)
          .select("id")
          .single()
      : await supabase
          .from("category_attribute_schemas")
          .insert(payload)
          .select("id")
          .single();

    if (result.error) {
      return { ok: false as const, error: result.error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/sell");
    return { ok: true as const, id: result.data.id as string };
  } catch (error) {
    return { ok: false as const, error: formatZodError(error) };
  }
}

export async function adminUpsertCountry(input: z.infer<typeof locationNodeSchema>) {
  try {
    const parsed = locationNodeSchema.parse(input);
    const { supabase } = await requireAdmin();
    const payload = {
      code: (parsed.code || slugify(parsed.name)).toUpperCase().slice(0, 8),
      name: parsed.name,
      is_active: parsed.isActive ?? false,
      sort_order: parsed.sortOrder ?? 0,
    };
    const result = parsed.id
      ? await supabase.from("countries").update(payload).eq("id", parsed.id).select("id").single()
      : await supabase.from("countries").insert(payload).select("id").single();
    if (result.error) return { ok: false as const, error: result.error.message };
    revalidatePath("/admin");
    revalidatePath("/sell");
    revalidatePath("/browse");
    return { ok: true as const, id: result.data.id as string };
  } catch (error) {
    return { ok: false as const, error: formatZodError(error) };
  }
}

export async function adminUpsertState(input: z.infer<typeof locationNodeSchema> & { countryId: string }) {
  try {
    const parsed = locationNodeSchema.extend({ countryId: z.string().uuid() }).parse(input);
    const { supabase } = await requireAdmin();
    const payload = {
      country_id: parsed.countryId,
      name: parsed.name,
      slug: parsed.slug || slugify(parsed.name),
      is_active: parsed.isActive ?? true,
      sort_order: parsed.sortOrder ?? 0,
    };
    const result = parsed.id
      ? await supabase.from("states").update(payload).eq("id", parsed.id).select("id").single()
      : await supabase.from("states").insert(payload).select("id").single();
    if (result.error) return { ok: false as const, error: result.error.message };
    revalidatePath("/admin");
    revalidatePath("/sell");
    revalidatePath("/browse");
    return { ok: true as const, id: result.data.id as string };
  } catch (error) {
    return { ok: false as const, error: formatZodError(error) };
  }
}

export async function adminUpsertCity(input: z.infer<typeof locationNodeSchema> & { stateId: string }) {
  try {
    const parsed = locationNodeSchema.extend({ stateId: z.string().uuid() }).parse(input);
    const { supabase } = await requireAdmin();
    const payload = {
      state_id: parsed.stateId,
      name: parsed.name,
      slug: parsed.slug || slugify(parsed.name),
      is_active: parsed.isActive ?? true,
      sort_order: parsed.sortOrder ?? 0,
    };
    const result = parsed.id
      ? await supabase.from("cities").update(payload).eq("id", parsed.id).select("id").single()
      : await supabase.from("cities").insert(payload).select("id").single();
    if (result.error) return { ok: false as const, error: result.error.message };
    revalidatePath("/admin");
    revalidatePath("/sell");
    revalidatePath("/browse");
    return { ok: true as const, id: result.data.id as string };
  } catch (error) {
    return { ok: false as const, error: formatZodError(error) };
  }
}

export async function adminUpsertArea(input: z.infer<typeof locationNodeSchema> & { cityId: string }) {
  try {
    const parsed = locationNodeSchema.extend({ cityId: z.string().uuid() }).parse(input);
    const { supabase } = await requireAdmin();
    const payload = {
      city_id: parsed.cityId,
      name: parsed.name,
      slug: parsed.slug || slugify(parsed.name),
      is_active: parsed.isActive ?? true,
      sort_order: parsed.sortOrder ?? 0,
    };
    const result = parsed.id
      ? await supabase.from("areas").update(payload).eq("id", parsed.id).select("id").single()
      : await supabase.from("areas").insert(payload).select("id").single();
    if (result.error) return { ok: false as const, error: result.error.message };
    revalidatePath("/admin");
    revalidatePath("/sell");
    revalidatePath("/browse");
    return { ok: true as const, id: result.data.id as string };
  } catch (error) {
    return { ok: false as const, error: formatZodError(error) };
  }
}
