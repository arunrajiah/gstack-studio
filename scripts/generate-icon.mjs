#!/usr/bin/env node
/**
 * Generates build/icon.png (1024×1024) using only Node.js built-ins.
 * Design: dark zinc-950 rounded-rect background + three indigo stack bars.
 * Run: node scripts/generate-icon.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT   = join(__dir, '../build/icon.png')

const W = 1024, H = 1024
const rgba = new Uint8Array(W * H * 4) // all transparent initially

// ── Drawing helpers ───────────────────────────────────────────────────────────

function px(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return
  const i = (y * W + x) * 4
  rgba[i] = r; rgba[i+1] = g; rgba[i+2] = b; rgba[i+3] = a
}

function roundRect(x0, y0, x1, y1, rx, r, g, b, a = 255) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      // corner distance test
      let cx = -1, cy = -1
      if      (x < x0 + rx && y < y0 + rx) { cx = x0 + rx; cy = y0 + rx }
      else if (x >= x1 - rx && y < y0 + rx) { cx = x1 - rx; cy = y0 + rx }
      else if (x < x0 + rx && y >= y1 - rx) { cx = x0 + rx; cy = y1 - rx }
      else if (x >= x1 - rx && y >= y1 - rx){ cx = x1 - rx; cy = y1 - rx }

      if (cx >= 0) {
        const dx = x - cx, dy = y - cy
        if (dx * dx + dy * dy > rx * rx) continue
      }
      px(x, y, r, g, b, a)
    }
  }
}

// ── Icon design ───────────────────────────────────────────────────────────────

// Background: zinc-950 (#09090b) with 180 px radius
roundRect(0, 0, W, H, 180, 9, 9, 11)

// Three horizontal "stack" bars, left-aligned, indigo shades
// Bar 1 — indigo-500 #6366f1, full width
roundRect(152, 318, 872, 426, 50,  99, 102, 241)
// Bar 2 — indigo-400 #818cf8, ¾ width
roundRect(152, 458, 712, 566, 50, 129, 140, 248)
// Bar 3 — indigo-300 #a5b4fc, ½ width
roundRect(152, 598, 552, 706, 50, 165, 180, 252)

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

function pngChunk(type, data) {
  const tb = Buffer.from(type, 'ascii')
  const lb = Buffer.allocUnsafe(4); lb.writeUInt32BE(data.length)
  const cb = Buffer.allocUnsafe(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])))
  return Buffer.concat([lb, tb, data, cb])
}

// IHDR — RGBA (colorType=6, bitDepth=8)
const ihdr = Buffer.allocUnsafe(13)
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

// Raw scanlines: filter byte 0 + RGBA pixels
const raw = Buffer.allocUnsafe(H * (1 + W * 4))
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 4)] = 0               // filter: None
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
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),   // PNG signature
  pngChunk('IHDR', ihdr),
  pngChunk('IDAT', deflateSync(raw, { level: 9 })),
  pngChunk('IEND', Buffer.alloc(0))
])

mkdirSync(join(__dir, '../build'), { recursive: true })
writeFileSync(OUT, png)
console.log(`✓  build/icon.png  (${(png.length / 1024).toFixed(1)} KB)`)
