// Promly megaphone mark (drawn by Jakob), on a 40x40 grid.
// One source for the header logo and the favicon generator.
// Colours follow docs/DESIGN.md: flat cobalt horn, yellow bell opening,
// "ink" parts (handle, rim, sound lines) that turn white on dark backgrounds,
// with the sound lines turning yellow there.

export const MARK = {
  cobalt: "#2440F0",
  marker: "#FFE14D",
  ink: "#0D1B2A",
  handle: "M12.5 23.5 10.25 32.5",
  horn: "M5.5 16.25 24.5 8.5v23L5.5 23.75C3.6 23.1 2.75 21.8 2.75 20s.85-3.1 2.75-3.75Z",
  bell: { cx: 25, cy: 20, rx: 3.75, ry: 11.75 },
  sound: ["M32 13.25 36 11", "M32.5 20h4.75", "M32 26.75 36 29"],
  stroke: { handle: 3.5, rim: 2.5, sound: 3 },
} as const;
