import { query as rawQuery, mutation as rawMutation } from "./_generated/server";
import { customQuery, customMutation } from "convex-helpers/server/customFunctions";

// Attach `userIdentity` once per invocation for convenience
type CtxWithAuth = { auth: { getUserIdentity: () => Promise<unknown> } } & Record<string, unknown>;
type WithIdentityResult<T extends CtxWithAuth> = { ctx: T & { userIdentity: unknown }; args: Record<string, never> };

const withIdentity = async <T extends CtxWithAuth>(ctx: T): Promise<WithIdentityResult<T>> => {
  const userIdentity = await ctx.auth.getUserIdentity();
  return { ctx: { ...ctx, userIdentity }, args: {} } as WithIdentityResult<T>;
};

export const authedQuery = customQuery(rawQuery, {
  args: {},
  input: async (ctx) => withIdentity(ctx as CtxWithAuth),
});

export const authedMutation = customMutation(rawMutation, {
  args: {},
  input: async (ctx) => withIdentity(ctx as CtxWithAuth),
});

// A tiny helper validator to require auth in handlers when needed
export const requireUser = (identity: unknown) => {
  if (!identity) throw new Error("Unauthorized");
};


