import { z } from "zod";

/** Koordinatlar metre cinsinden, sağ elli, Y yukarı. Bkz. docs/data-model.md. */
const coord = z.number().finite().min(-1000).max(1000);

export const Vec2Schema = z.tuple([coord, coord]);
export const Vec3Schema = z.tuple([coord, coord, coord]);

/** 0 ile 100 metre arası uzunluk. */
export const MetersSchema = z.number().finite().min(0).max(100);

export type Vec2 = z.infer<typeof Vec2Schema>;
export type Vec3 = z.infer<typeof Vec3Schema>;
