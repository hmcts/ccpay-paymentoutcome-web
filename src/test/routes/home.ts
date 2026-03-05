import { expect } from 'chai';
import request from 'supertest';
import * as mock from 'nock';
import * as feesServiceMock from '../http-mocks/fees';

import { app } from '../../main/app';
import { PaymentConfirmationTokenService } from '../../main/app/security/paymentConfirmationToken';

describe('Home route', () => {
  const paymentId = '34a90357-330e-4a25-8e69-20fd8c0a4712';
  const url = `/payment/${paymentId}/confirmation`;

  beforeEach(() => {
    mock.cleanAll();
  });

  test('returns 403 when token is missing', async () => {
    await request(app)
      .get(url)
      .expect((res) => expect(res.status).to.equal(403));
  });

  test('returns 403 when token is invalid', async () => {
    await request(app)
      .get(`${url}?token=invalid`)
      .expect((res) => expect(res.status).to.equal(403));
  });

  test('returns 200 when token is valid', async () => {
    const token = PaymentConfirmationTokenService.createToken({
      paymentId,
      payerReference: 'RC-1234-1234-1343-1234',
      exp: Math.floor(Date.now() / 1000) + 300,
    });
    feesServiceMock.resolveCreateToken();
    feesServiceMock.resolveGetPaymentStatus('Success');

    await request(app)
      .get(`${url}?token=${encodeURIComponent(token)}`)
      .expect((res) => expect(res.status).to.equal(200));
  });

  test('returns 403 when payer reference claim does not match payment data', async () => {
    const token = PaymentConfirmationTokenService.createToken({
      paymentId,
      payerReference: 'RC-9999-9999-9999-9999',
      exp: Math.floor(Date.now() / 1000) + 300,
    });
    feesServiceMock.resolveCreateToken();
    feesServiceMock.resolveGetPaymentStatus('Success');

    await request(app)
      .get(`${url}?token=${encodeURIComponent(token)}`)
      .expect((res) => expect(res.status).to.equal(403));
  });

  test('returns 404 for unknown route', async () => {
    await request(app)
      .get('/payment/some-id/confirmat')
      .expect((res) => expect(res.status).to.equal(404));
  });
});
