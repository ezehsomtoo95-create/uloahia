import { z } from "zod";
import { LISTING_CONDITIONS, LISTING_STATUSES } from "@/lib/constants/listings";
import { listingIdSchema } from "@/lib/validation/common";

export const listingStatusSchema = z.enum(LISTING_STATUSES);

export const listingConditionSchema = z.enum(
  LISTING_CONDITIONS as [string, ...string[]],
);

export const listingPhotoInputSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("existing"),
    url: z.string().trim().min(1, "Photo URL is required."),
  }),
  z.object({
    source: z.literal("new"),
    fieldName: z.string().trim().min(1, "Photo field is required."),
  }),
]);


/** Validates sell-flow listing payloads (create and update). */
export const ListingSchema = z.object({
  mode: z.enum(["create", "update"]).optional(),
  listingId: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    listingIdSchema.optional(),
  ),
  originalStatus: listingStatusSchema.optional(),
  title: z.string().trim().min(3, "Title is too short.").max(120, "Title is too long."),
  category: z.string().trim().min(1, "Category is required."),
  condition: listingConditionSchema,
  price: z.number().finite().positive("Price must be greater than zero."),
  description: z.string().trim().min(10, "Description is too short.").max(2000),
  state: z.string().trim().min(1, "State is required."),
  city: z.string().trim().min(1, "City is required."),
  area: z.string().trim().min(1, "Area is required."),
  photos: z
    .array(listingPhotoInputSchema)
    .min(1, "At least one photo is required.")
    .max(7, "You can upload up to 7 photos."),
});

export type ListingInput = z.infer<typeof ListingSchema>;
export type ListingPhotoInput = z.infer<typeof listingPhotoInputSchema>;


export const updateListingSchema = z.object({
  listingId: listingIdSchema,
  title: z.string().trim().min(3, "Title is too short.").max(120, "Title is too long."),
  category: z.string().trim().min(1, "Category is required."),
  condition: listingConditionSchema,
  price: z.number().finite().positive("Price must be greater than zero."),
  description: z.string().trim().min(10, "Description is too short.").max(2000),
  state: z.string().trim().min(1, "State is required."),
  city: z.string().trim().min(1, "City is required."),
  area: z.string().trim().min(1, "Area is required."),
  originalStatus: listingStatusSchema,
});

export const listingIdActionSchema = z.object({
  listingId: listingIdSchema,
});

export const adminUpdateListingSchema = z.object({
  listingId: listingIdSchema,
  title: z.string().trim().min(3).max(120),
  price: z.number().finite().positive(),
  description: z.string().trim().min(10).max(2000),
  category: z.string().trim().min(1),
  condition: listingConditionSchema,
  state: z.string().trim().min(1),
  city: z.string().trim().min(1),
  area: z.string().trim().min(1),
});

export const updateListingStatusSchema = z.object({
  listingId: listingIdSchema,
  status: listingStatusSchema,
  rejectionReason: z.string().trim().max(500).optional(),
});
