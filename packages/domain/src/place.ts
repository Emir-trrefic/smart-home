import { z } from "zod";
import { NameSchema } from "./ids.js";

/** Kullanıcının sahip olduğu veya katıldığı yer. Her mekânın kendi 3D planı ve cihazları vardır. */
export const PLACE_KINDS = ["home", "office", "other"] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number];
export const PlaceKindSchema = z.enum(PLACE_KINDS);

export const PlaceInputSchema = z.object({ name: NameSchema, kind: PlaceKindSchema }).strict();
export type PlaceInput = z.infer<typeof PlaceInputSchema>;

/** Roller mekân başınadır, küresel rol yoktur. Aynı kişi bir yerde owner, başka yerde guest olabilir. */
export const PLACE_ROLES = ["owner", "member", "guest"] as const;
export type PlaceRole = (typeof PLACE_ROLES)[number];
export const PlaceRoleSchema = z.enum(PLACE_ROLES);

/** Davetle verilebilecek roller. owner davetle verilemez. */
export const INVITE_ROLES = ["member", "guest"] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];
export const InviteRoleSchema = z.enum(INVITE_ROLES);
