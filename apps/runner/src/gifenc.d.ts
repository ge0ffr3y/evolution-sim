// The gifenc library ships no type definitions; this describes the small part we use.
declare module "gifenc" {
  export interface GifFrameOptions {
    palette?: number[][];
    /** Delay before the next frame, in milliseconds. */
    delay?: number;
    /** 0 = loop forever. */
    repeat?: number;
  }
  export interface GifEncoderStream {
    writeFrame(index: Uint8Array, width: number, height: number, options?: GifFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
  }
  export function GIFEncoder(options?: { initialCapacity?: number; auto?: boolean }): GifEncoderStream;
  // Node loads this package as CommonJS, so the encoder is reached through the default export.
  const gifenc: { GIFEncoder: typeof GIFEncoder };
  export default gifenc;
}
