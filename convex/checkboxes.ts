import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import type { DatabaseWriter, MutationCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { authedMutation, requireUser } from "./custom";
const NUM_BOXES = 1000000;
const BOXES_PER_DOCUMENT = 4000;
const NUM_DOCUMENTS = Math.floor(NUM_BOXES / BOXES_PER_DOCUMENT);

const isChecked = (view: Uint8Array, arrayIdx: number) => {
  const bit = arrayIdx % 8;
  const uintIdx = Math.floor(arrayIdx / 8);
  const byte = view ? view[uintIdx] : 0;
  const shiftedBit = 1 << bit;
  return !!(shiftedBit & byte);
};

const shiftBit = (
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

function toArrayBuffer(bufLike: ArrayBufferLike): ArrayBuffer {
  if (bufLike instanceof ArrayBuffer) return bufLike;
  const copy = new ArrayBuffer(bufLike.byteLength);
  new Uint8Array(copy).set(new Uint8Array(bufLike));
  return copy;
}

export const get = query({
  args: { documentIdx: v.number() },
  returns: v.union(v.bytes(), v.null()),
  handler: async (ctx, { documentIdx }) => {
    if (documentIdx < 0 || documentIdx >= NUM_DOCUMENTS) {
      throw new Error("documentIdx out of range");
    }
    return (
      await ctx.db
        .query("checkboxes")
        .withIndex("idx", (q) => q.eq("idx", documentIdx))
        .order("asc")
        .first()
    )?.boxes ?? null;
  },
});

export const toggle = authedMutation({
  args: { documentIdx: v.number(), arrayIdx: v.number(), checked: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { documentIdx, arrayIdx, checked }) => {
    requireUser(ctx.userIdentity);
    if (documentIdx < 0 || documentIdx >= NUM_DOCUMENTS) {
      throw new Error("documentIdx out of range");
    }
    if (arrayIdx < 0 || arrayIdx >= BOXES_PER_DOCUMENT) {
      throw new Error("arrayIdx out of range");
    }
    const db = ctx.db as unknown as DatabaseWriter;
    const checkbox = await db
      .query("checkboxes")
      .withIndex("idx", (q) => q.eq("idx", documentIdx))
      .first();

    if (!checkbox) {
      return null;
    }

    const bytes = checkbox.boxes;
    const view = new Uint8Array(bytes);
    const newBytesLike = shiftBit(view, arrayIdx, checked)?.buffer;

    if (newBytesLike) {
      const newBytes = toArrayBuffer(newBytesLike);
      await db.patch(checkbox._id, {
        idx: checkbox.idx,
        boxes: newBytes,
      });
    }
    return null;
  },
});

export const ensureSeeded = authedMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    requireUser(ctx.userIdentity);
    const db = ctx.db as unknown as DatabaseWriter;
    const exists = await db
      .query("checkboxes")
      .withIndex("idx", (q) => q.eq("idx", 0))
      .first();
    if (!exists) {
      const core = ctx as unknown as MutationCtx;
      await core.runMutation(internal.checkboxes.seed, {});
    }
    return null;
  },
});

export const seed = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const db = ctx.db as unknown as DatabaseWriter;
    const boxes = await db
      .query("checkboxes")
      .withIndex("idx")
      .order("asc")
      .collect();
    for (const box of boxes) {
      await db.delete(box._id);
    }

    const bytes = new Uint8Array(BOXES_PER_DOCUMENT / 8);
    for (let i = 0; i < NUM_DOCUMENTS; i++) {
      await db.insert("checkboxes", {
        idx: i,
        boxes: bytes.buffer,
      });
    }
    return null;
  },
});

export const toggleRandom = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    for (let i = 0; i < 10; i++) {
      const documentIdx = Math.floor(Math.random() * NUM_DOCUMENTS);
      const arrayIdx = Math.floor(Math.random() * 2);
      const db = ctx.db as unknown as DatabaseWriter;
      const box = await db
        .query("checkboxes")
        .withIndex("idx", (q) => q.eq("idx", documentIdx))
        .first();
      if (box) {
        const jitter = Math.random() * 100000;
        await ctx.scheduler.runAfter(jitter, api.checkboxes.toggle, {
          documentIdx,
          arrayIdx,
          checked: !isChecked(new Uint8Array(box.boxes), arrayIdx),
        });
      }
    }
    return null;
  },
});


