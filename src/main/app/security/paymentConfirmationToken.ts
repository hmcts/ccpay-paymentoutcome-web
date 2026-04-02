import crypto from 'crypto';
import config = require('config');

export interface PaymentConfirmationTokenClaims {
  paymentId: string;
  exp: number;
  caseNumber?: string;
  payerReference?: string;
}

export interface TokenVerificationResult {
  isValid: boolean;
  claims?: PaymentConfirmationTokenClaims;
}

interface TokenConfig {
  secret: string;
  allowedClockSkewSeconds: number;
}

function getTokenConfig(): TokenConfig {
  return {
    secret: config.get<string>('security.paymentConfirmationToken.secret'),
    allowedClockSkewSeconds: config.get<number>('security.paymentConfirmationToken.allowedClockSkewSeconds'),
  };
}

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function signPayload(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
}

function safeCompare(first: string, second: string): boolean {
  const firstBuffer = Buffer.from(first, 'utf8');
  const secondBuffer = Buffer.from(second, 'utf8');

  if (firstBuffer.length !== secondBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(firstBuffer, secondBuffer);
}

export class PaymentConfirmationTokenService {
  static createToken(claims: PaymentConfirmationTokenClaims): string {
    const { secret } = getTokenConfig();
    const payload = toBase64Url(JSON.stringify(claims));
    const signature = signPayload(payload, secret);
    return `${payload}.${signature}`;
  }

  static verifyToken(token: string, expectedPaymentId: string): TokenVerificationResult {
    const { secret, allowedClockSkewSeconds } = getTokenConfig();

    if (!token || !secret) {
      return { isValid: false };
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      return { isValid: false };
    }

    const [payload, signature] = parts;
    const expectedSignature = signPayload(payload, secret);
    if (!safeCompare(signature, expectedSignature)) {
      return { isValid: false };
    }

    let claims: PaymentConfirmationTokenClaims;
    try {
      claims = JSON.parse(fromBase64Url(payload));
    } catch {
      return { isValid: false };
    }

    if (!claims.paymentId || claims.paymentId !== expectedPaymentId) {
      return { isValid: false };
    }

    if (!claims.caseNumber && !claims.payerReference) {
      return { isValid: false };
    }

    if (!Number.isFinite(claims.exp)) {
      return { isValid: false };
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (claims.exp + allowedClockSkewSeconds < nowInSeconds) {
      return { isValid: false };
    }

    return {
      isValid: true,
      claims,
    };
  }
}
