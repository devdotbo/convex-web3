# Custom JWT Authentication in Convex

## Overview

A JWT (JSON Web Token) is a signed string containing claims about user identity, typically valid for a limited time. Convex supports custom JWT authentication for scenarios where standard OIDC providers don't fit your requirements.

## Server-Side Configuration

Configure a custom JWT provider in your `convex/auth.config.js` file:

```javascript
export default {
  providers: [
    {
      type: "customJwt",
      applicationID: "your-application-id",
      issuer: "https://your.issuer.url.com",
      jwks: "https://your.issuer.url.com/.well-known/jwks.json",
      algorithm: "RS256",
    },
  ],
};
```

### Configuration Parameters

| Parameter | Description | Required |
|-----------|-------------|----------|
| `type` | Must be `"customJwt"` | Yes |
| `applicationID` | Verifies the JWT's audience claim | Recommended |
| `issuer` | The JWT issuer URL | Yes |
| `jwks` | JSON Web Key Set URL for public keys | Yes |
| `algorithm` | Signing algorithm (`RS256` or `ES256`) | Yes |

## Security Considerations

### Application ID Validation
- Omitting `applicationID` can be insecure
- JWTs should have specific `iss` (issuer) and `aud` (audience) fields
- This prevents token reuse across different services

### JWT Requirements
- Tokens must be properly signed
- Must include expiration time
- Should contain user identity claims

## Custom Claims

Custom JWT claims can be accessed via nested properties in the token payload:

```json
{
  "properties": {
    "id": "123",
    "favoriteColor": "red"
  },
  "iss": "http://localhost:3000",
  "sub": "user:8fa2be73c2229e85",
  "exp": 1750968478
}
```

These custom claims can be accessed in your Convex functions through the authentication context.

## Client-Side Integration

Clients implementing custom JWT authentication must:

1. **Obtain Initial JWT**: Get the first JWT from your authentication service
2. **Token Refresh**: Request updated JWTs before expiration
3. **Pass to Convex**: Include the JWT in requests to Convex

### Implementation Recommendation

For client-side implementation, it's recommended to follow the Custom OIDC Provider integration guidelines, as the pattern is similar but with your own JWT generation service.

## Example Implementation Flow

1. User authenticates with your service
2. Your service generates a signed JWT with:
   - User identity (`sub` claim)
   - Expiration time (`exp` claim)
   - Audience (`aud` claim matching `applicationID`)
   - Issuer (`iss` claim matching configured `issuer`)
3. Client receives JWT and passes it to Convex
4. Convex validates the JWT against configured parameters
5. Authenticated requests proceed with user context

## Best Practices

- Keep JWT expiration times short (e.g., 15-60 minutes)
- Implement proper token refresh mechanisms
- Store sensitive user data in Convex, not in JWT claims
- Use HTTPS for all token transmission
- Regularly rotate signing keys
- Monitor for suspicious authentication patterns

## Troubleshooting

Common issues and solutions:

- **Invalid signature**: Verify JWKS URL is accessible and contains correct public keys
- **Audience mismatch**: Ensure JWT `aud` claim matches configured `applicationID`
- **Expired token**: Implement proper token refresh on the client
- **Invalid issuer**: JWT `iss` claim must match configured `issuer` exactly