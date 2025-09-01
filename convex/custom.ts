import { v } from "convex/values";
import { query as rawQuery, mutation as rawMutation, internalMutation as rawInternalMutation } from "./_generated/server";
import { customQuery, customMutation, customInternalMutation } from "convex-helpers/server/customFunctions";

// Extend ctx with an `userIdentity` loaded once for convenience
type AuthedCtx<Ctx> = Ctx & { userIdentity: Awaited<ReturnType<Ctx["auth"]["getUserIdentity"]>> };

const withIdentity = async <Ctx extends { auth: { getUserIdentity: () => Promise<any> } }>(
  ctx: Ctx,
) => {
  const userIdentity = await ctx.auth.getUserIdentity();
  return { ctx: { ...(ctx as any), userIdentity }, args: {} } as { ctx: AuthedCtx<Ctx>; args: {} };
};

export const authedQuery = customQuery(rawQuery, {
  args: {},
  input: async (ctx) => withIdentity(ctx),
});

export const authedMutation = customMutation(rawMutation, {
  args: {},
  input: async (ctx) => withIdentity(ctx),
});

export const authedInternalMutation = customInternalMutation(rawInternalMutation, {
  args: {},
  input: async (ctx) => withIdentity(ctx),
});

// A tiny helper validator to require auth in handlers when needed
export const requireUser = (identity: unknown) => {
  if (!identity) throw new Error("Unauthorized");
};


