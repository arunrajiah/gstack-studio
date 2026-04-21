#!/usr/bin/env node
/**
 * Generates build/icon.png (1024×1024) using only Node.js built-ins.
 * Design: dark zinc-950 background with a "gS" letter-mark monogram.
 *   • lowercase "g" in indigo-400
 *   • uppercase "S" in white
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

// Background: zinc-950 (#09090b) with 180 px corner radius
roundRect(0, 0, W, H, 180, 9, 9, 11)

// ── Pixel-font bitmaps (5 wide × 7 tall) ─────────────────────────────────────
//
// Lowercase "g" — double-story form
const G_BITMAP = [
  [0,1,1,1,0],  // ·███·
  [1,0,0,0,1],  // █···█
  [1,0,0,0,1],  // █···█
  [0,1,1,1,1],  // ·████
  [0,0,0,0,1],  // ····█
  [1,0,0,0,1],  // █···█
  [0,1,1,1,0],  // ·███·
]

// Uppercase "S"
const S_BITMAP = [
  [0,1,1,1,0],  // ·███·
  [1,0,0,0,1],  // █···█
  [1,0,0,0,0],  // █····
  [0,1,1,1,0],  // ·███·
  [0,0,0,0,1],  // ····█
  [1,0,0,0,1],  // █···█
  [0,1,1,1,0],  // ·███·
]

// Layout constants
const CELL     = 72   // px per bitmap cell
const BLOCK_R  = 10   // corner radius per block
const PAD      =  5   // gap between adjacent blocks (each side)
const GAP_COLS =  1   // empty cell columns between "g" and "S"

const COLS     = 5
const ROWS     = G_BITMAP.length

const totalW  = (COLS * 2 + GAP_COLS) * CELL
const totalH  = ROWS * CELL
const startX  = Math.floor((W - totalW) / 2)
const startY  = Math.floor((H - totalH) / 2)

// Draw a bitmap starting at pixel offset (ox, oy) in given colour
function drawBitmap(bitmap, ox, oy, r, g, b) {
  for (let row = 0; row < bitmap.length; row++) {
    for (let col = 0; col < bitmap[row].length; col++) {
      if (!bitmap[row][col]) continue
      const x0 = ox + col * CELL + PAD
      const y0 = oy + row * CELL + PAD
      const x1 = x0 + CELL - PAD * 2
      const y1 = y0 + CELL - PAD * 2
      roundRect(x0, y0, x1, y1, BLOCK_R, r, g, b)
    }
  }
}

// "g" — indigo-400 (#818cf8)
drawBitmap(G_BITMAP, startX, startY, 129, 140, 248)

// "S" — white (#ffffff)
const sOffsetX = startX + (COLS + GAP_COLS) * CELL
drawBitmap(S_BITMAP, sOffsetX, startY, 255, 255, 255)

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
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),   // PNG signature
  pngChunk('IHDR', ihdr),
  pngChunk('IDAT', deflateSync(raw, { level: 9 })),
  pngChunk('IEND', Buffer.alloc(0))
])

mkdirSync(join(__dir, '../build'), { recursive: true })
writeFileSync(OUT, png)
console.log(`✓  build/icon.png  (${(png.length / 1024).toFixed(1)} KB)`)
console.log(`   "gS" monogram: indigo-400 "g" + white "S" on zinc-950 background`)
console.log(`   Cell size: ${CELL}px · Block radius: ${BLOCK_R}px · Layout: ${totalW}×${totalH}px centered`)
