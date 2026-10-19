import { z } from "zod";

const id = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const finite = z.number().finite();
const meters = z.number().finite().min(0).max(100);
const vec2 = z.tuple([finite.min(-1000).max(1000), finite.min(-1000).max(1000)]);
const vec3 = z.tuple([
  finite.min(-1000).max(1000),
  finite.min(-1000).max(1000),
  finite.min(-1000).max(1000),
]);

const wall = z
  .object({
    id,
    start: vec2,
    end: vec2,
    thickness: z.number().finite().min(0.01).max(2),
    height: z.number().finite().min(0.5).max(20),
  })
  .strict();

const opening = z
  .object({
    id,
    wallId: id,
    offset: meters,
    width: z.number().finite().min(0.1).max(20),
    height: z.number().finite().min(0.1).max(20),
  })
  .strict();

const windowSchema = opening.extend({ sill: meters.default(0) }).strict();

const object = z
  .object({
    id,
    category: z.string().regex(/^[a-z0-9_]{1,40}$/),
    position: vec3,
    dimensions: vec3,
    rotationY: finite.min(-Math.PI * 2).max(Math.PI * 2).default(0),
    confidence: z.enum(["low", "medium", "high"]),
  })
  .strict();

const room = z
  .object({
    id,
    name: z.string().trim().min(1).max(80),
    levelId: id,
    height: z.number().finite().min(0.5).max(20),
    walls: z.array(wall).max(200),
    doors: z.array(opening).max(50),
    windows: z.array(windowSchema).max(50),
    objects: z.array(object).max(500),
  })
  .strict();

const level = z
  .object({ id, name: z.string().trim().min(1).max(80), elevation: finite.min(-100).max(500) })
  .strict();

/** Tarama yükü şeması, bkz. docs/data-model.md. Sürüm 1. */
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
