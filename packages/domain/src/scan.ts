import { z } from "zod";
import { IdSchema, NameSchema } from "./ids.js";
import { MetersSchema, Vec2Schema, Vec3Schema } from "./geometry.js";

const finite = z.number().finite();

const wall = z
  .object({
    id: IdSchema,
    start: Vec2Schema,
    end: Vec2Schema,
    thickness: z.number().finite().min(0.01).max(2),
    height: z.number().finite().min(0.5).max(20),
  })
  .strict();

const opening = z
  .object({
    id: IdSchema,
    wallId: IdSchema,
    offset: MetersSchema,
    width: z.number().finite().min(0.1).max(20),
    height: z.number().finite().min(0.1).max(20),
  })
  .strict();

const windowSchema = opening.extend({ sill: MetersSchema.default(0) }).strict();

const object = z
  .object({
    id: IdSchema,
    category: z.string().regex(/^[a-z0-9_]{1,40}$/),
    position: Vec3Schema,
    dimensions: Vec3Schema,
    rotationY: finite.min(-Math.PI * 2).max(Math.PI * 2).default(0),
    confidence: z.enum(["low", "medium", "high"]),
  })
  .strict();

const room = z
  .object({
    id: IdSchema,
    name: NameSchema,
    levelId: IdSchema,
    height: z.number().finite().min(0.5).max(20),
    walls: z.array(wall).max(200),
    doors: z.array(opening).max(50),
    windows: z.array(windowSchema).max(50),
    objects: z.array(object).max(500),
  })
  .strict();

const level = z.object({ id: IdSchema, name: NameSchema, elevation: finite.min(-100).max(500) }).strict();

/** Tarama yükü, sürüm 1. Bkz. docs/data-model.md. */
export const ScanUploadSchema = z
  .object({
    version: z.literal(1),
    source: z.literal("roomplan"),
    capturedAt: z.string().datetime(),
    levels: z.array(level).min(1).max(20),
    rooms: z.array(room).min(1).max(100),
  })
  .strict()
  .superRefine((scan, ctx) => {
    const levelIds = new Set(scan.levels.map((l) => l.id));
    scan.rooms.forEach((r, i) => {
      if (!levelIds.has(r.levelId)) {
        ctx.addIssue({ code: "custom", path: ["rooms", i, "levelId"], message: "Bilinmeyen kat" });
      }
      const wallIds = new Set(r.walls.map((w) => w.id));
      [...r.doors, ...r.windows].forEach((o) => {
        if (!wallIds.has(o.wallId)) {
          ctx.addIssue({ code: "custom", path: ["rooms", i], message: "Açıklık bilinmeyen duvara bağlı" });
        }
      });
    });
  });

export type ScanUpload = z.infer<typeof ScanUploadSchema>;
