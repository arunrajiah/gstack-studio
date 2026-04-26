#!/usr/bin/env node
/**
 * Generates build/icon.png (1024×1024) — gstack Studio app icon.
 *
 * Design: indigo-600 rounded-rect background with a white Zap lightning bolt,
 * directly matching the brand mark shown in the app titlebar.
 *
 * Run: node scripts/generate-icon.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync }              from 'node:zlib'
import { dirname, join }            from 'node:path'
import { fileURLToPath }            from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT   = join(__dir, '../build/icon.png')

const W = 1024, H = 1024
const rgba = new Uint8Array(W * H * 4)   // RGBA, all transparent

// ── Pixel helpers ─────────────────────────────────────────────────────────────

function setpx(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return
  const i = (y * W + x) * 4
  // Simple alpha composite over existing colour
  const oa = rgba[i + 3] / 255
  const na = a / 255
  const out = na + oa * (1 - na)
  if (out === 0) return
  rgba[i]     = Math.round((r * na + rgba[i]     * oa * (1 - na)) / out)
  rgba[i + 1] = Math.round((g * na + rgba[i + 1] * oa * (1 - na)) / out)
  rgba[i + 2] = Math.round((b * na + rgba[i + 2] * oa * (1 - na)) / out)
  rgba[i + 3] = Math.round(out * 255)
}

/** Filled rounded-rect with per-pixel alpha for smooth edges. */
function roundRect(x0, y0, x1, y1, rx, r, g, b) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      // Determine corner coverage
      let cx = -1, cy = -1
      if      (x < x0 + rx && y < y0 + rx) { cx = x0 + rx; cy = y0 + rx }
      else if (x > x1 - rx && y < y0 + rx) { cx = x1 - rx; cy = y0 + rx }
      else if (x < x0 + rx && y > y1 - rx) { cx = x0 + rx; cy = y1 - rx }
      else if (x > x1 - rx && y > y1 - rx) { cx = x1 - rx; cy = y1 - rx }

      if (cx >= 0) {
        const dx = x - cx, dy = y - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > rx + 0.5) continue
        // Anti-alias the edge
        const a = dist > rx - 0.5 ? Math.round((rx + 0.5 - dist) * 255) : 255
        setpx(x, y, r, g, b, a)
      } else {
        setpx(x, y, r, g, b, 255)
      }
    }
  }
}

/** Scanline polygon fill. */
function fillPolygon(points, r, g, b) {
  const n = points.length
  const ys = points.map(p => p[1])
  const minY = Math.floor(Math.min(...ys))
  const maxY = Math.ceil(Math.max(...ys))

  for (let y = minY; y <= maxY; y++) {
    const xs = []
    for (let i = 0; i < n; i++) {
      const [x1, y1] = points[i]
      const [x2, y2] = points[(i + 1) % n]
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1))
      }
    }
    xs.sort((a, b) => a - b)
    for (let i = 0; i + 1 < xs.length; i += 2) {
      for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++) {
        setpx(x, y, r, g, b, 255)
      }
    }
  }
}

// ── Icon design ───────────────────────────────────────────────────────────────
//
// Layer 1: zinc-950 background (#09090b) with 180 px corner radius
// Layer 2: indigo-600 (#4f46e5) inner rounded square, 760×760, centered
// Layer 3: white Zap bolt, centered in the indigo square

// 1. Background
roundRect(0, 0, W - 1, H - 1, 180, 9, 9, 11)

// 2. Indigo square — 760×760, centred, rx = 150
const SQ = 760, SQ_X0 = (W - SQ) / 2, SQ_Y0 = (H - SQ) / 2
roundRect(SQ_X0, SQ_Y0, SQ_X0 + SQ - 1, SQ_Y0 + SQ - 1, 150, 79, 70, 229)  // indigo-600

// 3. Zap bolt — based on lucide-react "zap" path (24×24 viewBox)
//    Path: M13 2L3 14h9l-1 8 10-12h-9l1-8z
//    Vertices: (13,2) (3,14) (12,14) (11,22) (21,10) (12,10)
//    Bounding box: x 3–21 (range 18), y 2–22 (range 20)

const BOLT_PAD  = 110   // padding inside the indigo square
const BOLT_W    = SQ - BOLT_PAD * 2        // 540
const BOLT_H    = SQ - BOLT_PAD * 2 + 60  // 600  (taller than wide for natural bolt shape)
const BOLT_X0   = SQ_X0 + BOLT_PAD
const BOLT_Y0   = SQ_Y0 + BOLT_PAD - 30

const srcW = 21 - 3   // 18 — horizontal span in lucide coords
const srcH = 22 - 2   // 20 — vertical span in lucide coords
const scaleX = BOLT_W / srcW
const scaleY = BOLT_H / srcH

const zapSrc = [[13,2],[3,14],[12,14],[11,22],[21,10],[12,10]]
const zapPts = zapSrc.map(([x, y]) => [
  BOLT_X0 + (x - 3) * scaleX,
  BOLT_Y0 + (y - 2) * scaleY,
])

fillPolygon(zapPts, 255, 255, 255)

// ── PNG encoder ───────────────────────────────────────────────────────────────

function crc32(buf) {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  let c = 0xffffffff
  for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const tb = Buffer.from(type, 'ascii')
  const lb = Buffer.allocUnsafe(4); lb.writeUInt32BE(data.length)
  const cb = Buffer.allocUnsafe(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])))
  return Buffer.concat([lb, tb, data, cb])
}

const ihdr = Buffer.allocUnsafe(13)
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

const raw = Buffer.allocUnsafe(H * (1 + W * 4))
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 4)] = 0
  for (let x = 0; x < W; x++) {
    const si = (y * W + x) * 4
    const di = y * (1 + W * 4) + 1 + x * 4
    raw[di]   = rgba[si]
    raw[di+1] = rgba[si+1]
    raw[di+2] = rgba[si+2]
    raw[di+3] = rgba[si+3]
  }
}

const png = Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])

mkdirSync(join(__dir, '../build'), { recursive: true })
writeFileSync(OUT, png)
console.log(`✓  build/icon.png  (${(png.length / 1024).toFixed(1)} KB)`)
console.log(`   Design: zinc-950 bg → indigo-600 square (760×760) → white Zap bolt`)
