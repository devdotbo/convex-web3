export default {
  providers: [
    {
      type: "customJwt",
      applicationID: process.env.JWT_APPLICATION_ID || "convex-web3",
      issuer: process.env.JWT_ISSUER || "http://localhost:3000",
      jwks:
        (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000") +
        "/api/auth/jwks",
      algorithm: "ES256",
    },
  ],
};


