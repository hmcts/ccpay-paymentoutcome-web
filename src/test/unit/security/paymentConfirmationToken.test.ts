import crypto from 'crypto';
import config from 'config';
import { PaymentConfirmationTokenService } from '../../../main/app/security/paymentConfirmationToken';

describe('PaymentConfirmationTokenService', () => {
  const paymentId = '34a90357-330e-4a25-8e69-20fd8c0a4712';

  function signPayload(payload: string): string {
    return crypto
      .createHmac('sha256', config.get<string>('security.paymentConfirmationToken.secret'))
      .update(payload)
      .digest('base64url');
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('accepts a valid token', () => {
    const token = PaymentConfirmationTokenService.createToken({
      paymentId,
      payerReference: 'RC-1234-1234-1343-1234',
      caseNumber: '1111222233334444',
      exp: Math.floor(Date.now() / 1000) + 300,
    });

    const verification = PaymentConfirmationTokenService.verifyToken(token, paymentId);

    expect(verification.isValid).toBeTruthy();
    expect(verification.claims?.caseNumber).toBe('1111222233334444');
  });

  test('rejects a token with a mismatched payment id', () => {
    const token = PaymentConfirmationTokenService.createToken({
      paymentId: 'some-other-id',
      payerReference: 'RC-1234-1234-1343-1234',
      exp: Math.floor(Date.now() / 1000) + 300,
    });

    const verification = PaymentConfirmationTokenService.verifyToken(token, paymentId);

    expect(verification.isValid).toBeFalsy();
  });

  test('rejects an expired token', () => {
    const token = PaymentConfirmationTokenService.createToken({
      paymentId,
      payerReference: 'RC-1234-1234-1343-1234',
      exp: Math.floor(Date.now() / 1000) - 120,
    });

    const verification = PaymentConfirmationTokenService.verifyToken(token, paymentId);

    expect(verification.isValid).toBeFalsy();
  });

  test('rejects a tampered token', () => {
    const token = PaymentConfirmationTokenService.createToken({
      paymentId,
      payerReference: 'RC-1234-1234-1343-1234',
      exp: Math.floor(Date.now() / 1000) + 300,
    });

    const [payload, signature] = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ paymentId: 'tampered-id', exp: Math.floor(Date.now() / 1000) + 300 }),
      'utf8',
    ).toString('base64url');

    const tamperedToken = `${tamperedPayload}.${signature || payload}`;
    const verification = PaymentConfirmationTokenService.verifyToken(tamperedToken, paymentId);

    expect(verification.isValid).toBeFalsy();
  });

  test('rejects a token without payer/case binding claims', () => {
    const token = PaymentConfirmationTokenService.createToken({
      paymentId,
      exp: Math.floor(Date.now() / 1000) + 300,
    });

    const verification = PaymentConfirmationTokenService.verifyToken(token, paymentId);

    expect(verification.isValid).toBeFalsy();
  });

  test('rejects malformed token structure', () => {
    const verification = PaymentConfirmationTokenService.verifyToken('invalid-token-without-separator', paymentId);

    expect(verification.isValid).toBeFalsy();
  });

  test('rejects token with invalid JSON payload', () => {
    const invalidPayload = Buffer.from('not-json', 'utf8').toString('base64url');
    const token = `${invalidPayload}.${signPayload(invalidPayload)}`;

    const verification = PaymentConfirmationTokenService.verifyToken(token, paymentId);

    expect(verification.isValid).toBeFalsy();
  });

  test('rejects token when exp is not numeric', () => {
    const token = PaymentConfirmationTokenService.createToken({
      paymentId,
      payerReference: 'RC-1234-1234-1343-1234',
      exp: 'not-a-number' as unknown as number,
    });

    const verification = PaymentConfirmationTokenService.verifyToken(token, paymentId);

    expect(verification.isValid).toBeFalsy();
  });

  test('rejects token when signature length does not match', () => {
    const validToken = PaymentConfirmationTokenService.createToken({
      paymentId,
      payerReference: 'RC-1234-1234-1343-1234',
      exp: Math.floor(Date.now() / 1000) + 300,
    });
    const [payload] = validToken.split('.');

    const verification = PaymentConfirmationTokenService.verifyToken(`${payload}.x`, paymentId);

    expect(verification.isValid).toBeFalsy();
  });

  test('rejects token when signing secret is unavailable', () => {
    jest.spyOn(config, 'get').mockImplementation(((key: string) => {
      if (key === 'security.paymentConfirmationToken.secret') {
        return '';
      }
      if (key === 'security.paymentConfirmationToken.allowedClockSkewSeconds') {
        return 30;
      }
      return undefined;
    }) as any);

    const verification = PaymentConfirmationTokenService.verifyToken('payload.signature', paymentId);

    expect(verification.isValid).toBeFalsy();
  });
});
