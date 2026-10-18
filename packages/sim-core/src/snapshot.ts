import type { SimConfig } from "./config";

/**
 * A saved world. `state` holds everything that is plain data (counters, the energy ledger,
 * the random-number generator, notable events, the family tree...) and `arrays` holds the
 * big typed arrays (organisms, land, scent). Loading a snapshot and running on gives exactly
 * the same history as never having stopped.
 */
export type SnapshotArray = Float32Array | Float64Array | Uint32Array | Uint16Array | Uint8Array | Int32Array;

export interface SimSnapshot {
  /** Bumped whenever the saved layout changes, so old files are refused instead of misread. */
  format: number;
  seed: number;
  config: SimConfig;
  state: Record<string, unknown>;
  arrays: Record<string, SnapshotArray>;
}

export const SNAPSHOT_FORMAT = 1;

const MAGIC = "EVOSNAP1";
const KINDS = {
  f32: Float32Array,
  f64: Float64Array,
  u32: Uint32Array,
  u16: Uint16Array,
  u8: Uint8Array,
  i32: Int32Array,
} as const;
type Kind = keyof typeof KINDS;


/** Text to UTF-8 bytes (written by hand so sim-core does not depend on a text-encoding library being present). */
function utf8Encode(text: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code >= 0xd800 && code < 0xdc00 && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xdc00 && low < 0xe000) {
        code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
        i++;
      }
    }
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    else out.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
  }
  return Uint8Array.from(out);
}

function utf8Decode(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++]!;
    let code: number;
    if (b < 0x80) code = b;
    else if (b < 0xe0) code = ((b & 31) << 6) | (bytes[i++]! & 63);
    else if (b < 0xf0) code = ((b & 15) << 12) | ((bytes[i++]! & 63) << 6) | (bytes[i++]! & 63);
    else code = ((b & 7) << 18) | ((bytes[i++]! & 63) << 12) | ((bytes[i++]! & 63) << 6) | (bytes[i++]! & 63);
    if (code >= 0x10000) {
      code -= 0x10000;
      text += String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 1023));
    } else {
      text += String.fromCharCode(code);
    }
  }
  return text;
}

function kindOf(array: SnapshotArray): Kind {
  if (array instanceof Float32Array) return "f32";
  if (array instanceof Float64Array) return "f64";
  if (array instanceof Uint32Array) return "u32";
  if (array instanceof Uint16Array) return "u16";
  if (array instanceof Int32Array) return "i32";
  return "u8";
}

/**
 * Pack a snapshot into one block of bytes, for saving to a file: the 8-byte tag "EVOSNAP1",
 * the length of a JSON header, the header, then every array one after another (each starting
 * on an 8-byte boundary). Numbers are stored in the machine's byte order, which is
 * little-endian on every computer that runs browsers.
 */
export function snapshotToBytes(snapshot: SimSnapshot): Uint8Array {
  const names = Object.keys(snapshot.arrays);
  const table: { name: string; kind: Kind; length: number; offset: number }[] = [];
  let offset = 0;
  for (const name of names) {
    const array = snapshot.arrays[name]!;
    table.push({ name, kind: kindOf(array), length: array.length, offset });
    offset += Math.ceil(array.byteLength / 8) * 8;
  }
  const header = utf8Encode(JSON.stringify({ format: snapshot.format, seed: snapshot.seed, config: snapshot.config, state: snapshot.state, table }));
  const headerEnd = MAGIC.length + 4 + header.length;
  const dataStart = Math.ceil(headerEnd / 8) * 8;
  const bytes = new Uint8Array(dataStart + offset);
  bytes.set(utf8Encode(MAGIC), 0);
  new DataView(bytes.buffer).setUint32(MAGIC.length, header.length, true);
  bytes.set(header, MAGIC.length + 4);
  for (const entry of table) {
    const array = snapshot.arrays[entry.name]!;
    bytes.set(new Uint8Array(array.buffer, array.byteOffset, array.byteLength), dataStart + entry.offset);
  }
  return bytes;
}

/** The reverse of snapshotToBytes. Throws a plain-English error if the bytes are not a saved world. */
export function snapshotFromBytes(bytes: Uint8Array): SimSnapshot {
  const tag = utf8Decode(bytes.subarray(0, MAGIC.length));
  if (tag !== MAGIC) throw new Error("This file is not a saved Evolution Sim world");
  const headerLength = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(MAGIC.length, true);
  const headerEnd = MAGIC.length + 4 + headerLength;
  const header = JSON.parse(utf8Decode(bytes.subarray(MAGIC.length + 4, headerEnd))) as {
    format: number;
    seed: number;
    config: SimConfig;
    state: Record<string, unknown>;
    table: { name: string; kind: Kind; length: number; offset: number }[];
  };
  if (header.format !== SNAPSHOT_FORMAT) throw new Error(`This saved world is from a different version of the simulation (format ${header.format}, expected ${SNAPSHOT_FORMAT})`);
  const dataStart = Math.ceil(headerEnd / 8) * 8;
  const arrays: Record<string, SnapshotArray> = {};
  for (const entry of header.table) {
    const Type = KINDS[entry.kind];
    const start = dataStart + entry.offset;
    const size = entry.length * Type.BYTES_PER_ELEMENT;
    if (start + size > bytes.length) throw new Error("This saved world file is cut short");
    // Copy into a fresh buffer so the array is correctly aligned whatever the source offset.
    arrays[entry.name] = new Type(bytes.slice(start, start + size).buffer);
  }
  return { format: header.format, seed: header.seed, config: header.config, state: header.state, arrays };
}
