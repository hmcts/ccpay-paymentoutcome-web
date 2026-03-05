import { PaymentConfirmationTokenService } from '../../../main/app/security/paymentConfirmationToken';

describe('PaymentConfirmationTokenService', () => {
  const paymentId = '34a90357-330e-4a25-8e69-20fd8c0a4712';

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
});
