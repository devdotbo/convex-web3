export const NUM_BOXES = 1000000;
export const BOXES_PER_DOCUMENT = 4000;
export const NUM_DOCUMENTS = Math.floor(NUM_BOXES / BOXES_PER_DOCUMENT);

export const isChecked = (view: Uint8Array, arrayIdx: number) => {
  const bit = arrayIdx % 8;
  const uintIdx = Math.floor(arrayIdx / 8);
  const byte = view ? view[uintIdx] : 0;
  const shiftedBit = 1 << bit;
  return !!(shiftedBit & byte);
};

export const shiftBit = (
  view: Uint8Array,
  arrayIdx: number,
  checked: boolean
) => {
  const bit = arrayIdx % 8;
  const uintIdx = Math.floor(arrayIdx / 8);
  const byte = view[uintIdx];
  const shiftedBit = 1 << bit;
  const isCurrentlyChecked = isChecked(view, arrayIdx);

  if (isCurrentlyChecked === checked) {
    return;
  }

  view[uintIdx] = shiftedBit ^ byte;
  return view;
};

export function ensureArrayBuffer(bufLike: ArrayBufferLike): ArrayBuffer {
  if (bufLike instanceof ArrayBuffer) return bufLike;
  const copy = new ArrayBuffer(bufLike.byteLength);
  new Uint8Array(copy).set(new Uint8Array(bufLike));
  return copy;
}


