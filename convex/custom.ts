import { query as rawQuery, mutation as rawMutation } from "./_generated/server";
import { customQuery, customMutation } from "convex-helpers/server/customFunctions";

// Attach `userIdentity` once per invocation for convenience
const withIdentity = async (ctx: { auth: { getUserIdentity: () => Promise<unknown> } }) => {
  const userIdentity = await ctx.auth.getUserIdentity();
  return { ctx: { ...(ctx as any), userIdentity }, args: {} } as { ctx: typeof ctx & { userIdentity: unknown }; args: {} };
};

export const authedQuery = customQuery(rawQuery, {
  args: {},
  input: async (ctx) => withIdentity(ctx as any),
});

export const authedMutation = customMutation(rawMutation, {
  args: {},
  input: async (ctx) => withIdentity(ctx as any),
});

// A tiny helper validator to require auth in handlers when needed
export const requireUser = (identity: unknown) => {
  if (!identity) throw new Error("Unauthorized");
};


