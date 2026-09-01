declare module "jsonwebtoken" {
  export interface SignOptions {
    expiresIn?: string | number;
    notBefore?: string | number;
    audience?: string | string[];
    algorithm?: string;
    header?: Record<string, unknown>;
    encoding?: string;
    issuer?: string;
    subject?: string;
    jwtid?: string;
    noTimestamp?: boolean;
    keyid?: string;
    mutatePayload?: boolean;
  }

  export function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: string | Buffer,
    options?: SignOptions
  ): string;

  export function verify(
    token: string,
    secretOrPublicKey: string | Buffer,
    options?: Record<string, unknown>
  ): unknown;

  export function decode(
    token: string,
    options?: Record<string, unknown>
  ): unknown;

  export class JsonWebTokenError extends Error {}
  export class TokenExpiredError extends JsonWebTokenError {}
  export class NotBeforeError extends JsonWebTokenError {}
}
