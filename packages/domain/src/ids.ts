import { z } from "zod";

/** Sunucunun ürettiği veya istemcinin verdiği kimlikler: harf, rakam, tire, alt çizgi. */
export const IdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

/** Kullanıcıya gösterilen ad (mekân, oda, cihaz adı). */
export const NameSchema = z.string().trim().min(1).max(80);
