export const validScan = {
  version: 1,
  source: "roomplan",
  capturedAt: "2026-10-19T12:00:00Z",
  levels: [{ id: "l0", name: "Zemin kat", elevation: 0 }],
  rooms: [
    {
      id: "r1",
      name: "Salon",
      levelId: "l0",
      height: 2.6,
      walls: [{ id: "w1", start: [0, 0], end: [4, 0], thickness: 0.12, height: 2.6 }],
      doors: [{ id: "d1", wallId: "w1", offset: 1, width: 0.9, height: 2 }],
      windows: [{ id: "n1", wallId: "w1", offset: 2.5, width: 1.2, height: 1.1, sill: 0.9 }],
      objects: [
        {
          id: "o1",
          category: "sofa",
          position: [1.5, 0.4, 2],
          dimensions: [2, 0.8, 0.9],
          rotationY: 0,
          confidence: "high",
        },
      ],
    },
  ],
};
