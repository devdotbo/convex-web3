const jwksUrl = process.env.JWT_JWKS_URL;
if (!jwksUrl) {
  throw new Error(
    "JWT_JWKS_URL is required for Convex customJwt verification. Set it to your public JWKS endpoint, e.g. https://your-domain.com/api/auth/jwks"
  );
}

export default {
  providers: [
    {
      type: "customJwt",
      applicationID: process.env.JWT_APPLICATION_ID || "convex-web3",
      issuer: process.env.JWT_ISSUER || "http://localhost:3000",
      jwks: jwksUrl,
      algorithm: "ES256",
    },
  ],
};


