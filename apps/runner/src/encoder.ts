import gifenc, { type GifEncoderStream } from "gifenc";

type Factory = () => GifEncoderStream;

/**
 * Make a GIF encoder. The gifenc package loads differently under Node (a
 * CommonJS object holding GIFEncoder) and under bundlers and the test runner
 * (the function itself), so accept either.
 */
export function createGifEncoder(): GifEncoderStream {
  const loaded = gifenc as unknown as Factory | { GIFEncoder: Factory };
  return typeof loaded === "function" ? loaded() : loaded.GIFEncoder();
}
