import { expect } from 'chai';
import request from 'supertest';
import nock from 'nock';
import config from 'config';

import { app } from '../../main/app';
import { PaymentConfirmationTokenService } from '../../main/app/security/paymentConfirmationToken';

describe('Home route', () => {
  const paymentId = '34a90357-330e-4a25-8e69-20fd8c0a4712';
  const routeUrl = `/payment/${paymentId}/confirmation`;
  const payhubUrl = config.get<string>('payhub.url');
  const s2sUrl = config.get<string>('s2s.url');

  function mockAuthToken(): void {
    nock(s2sUrl)
      .post(/.*/)
      .reply(200, 'token');
  }

  function mockPaymentStatusResponse(statusCode: number, body: any): void {
    nock(payhubUrl)
      .get(`/card-payments/${paymentId}/status`)
      .reply(statusCode, body);
  }

  function buildToken(overrides: any = {}): string {
    return PaymentConfirmationTokenService.createToken({
      paymentId,
      payerReference: 'RC-1234-1234-1343-1234',
      exp: Math.floor(Date.now() / 1000) + 300,
      ...overrides,
    });
  }

  beforeEach(() => {
    nock.cleanAll();
  });

  test('returns 403 when token is missing', async () => {
    await request(app)
      .get(routeUrl)
      .expect((res) => expect(res.status).to.equal(403));
  });

  test('returns 403 when token is invalid', async () => {
    await request(app)
      .get(`${routeUrl}?token=invalid`)
      .expect((res) => expect(res.status).to.equal(403));
  });

  test('returns 200 when token is valid', async () => {
    const token = buildToken();
    mockAuthToken();
    mockPaymentStatusResponse(200, { status: 'Success', reference: 'RC-1234-1234-1343-1234' });

    await request(app)
      .get(`${routeUrl}?token=${encodeURIComponent(token)}`)
      .expect((res) => expect(res.status).to.equal(200));
  });

  test('returns 403 when payer reference claim does not match payment data', async () => {
    const token = buildToken({ payerReference: 'RC-9999-9999-9999-9999' });
    mockAuthToken();
    mockPaymentStatusResponse(200, { status: 'Success', reference: 'RC-1234-1234-1343-1234' });

    await request(app)
      .get(`${routeUrl}?token=${encodeURIComponent(token)}`)
      .expect((res) => expect(res.status).to.equal(403));
  });

  test('returns 403 when case number claim does not match payment data', async () => {
    const token = buildToken({ caseNumber: '1111222233334444' });
    mockAuthToken();
    mockPaymentStatusResponse(200, {
      status: 'Success',
      reference: 'RC-1234-1234-1343-1234',
      ccd_case_number: '9999000011112222',
    });

    await request(app)
      .get(`${routeUrl}?token=${encodeURIComponent(token)}`)
      .expect((res) => expect(res.status).to.equal(403));
  });

  test('renders Welsh confirmation when language=cy', async () => {
    const token = buildToken();
    mockAuthToken();
    mockPaymentStatusResponse(200, { status: 'Success', reference: 'RC-1234-1234-1343-1234' });

    await request(app)
      .get(`${routeUrl}?token=${encodeURIComponent(token)}&language=cy`)
      .expect((res) => {
        expect(res.status).to.equal(200);
        expect(res.text).to.contain('Taliad yn llwyddiannus');
      });
  });

  test('renders error summary when payment status is not Success', async () => {
    const token = buildToken();
    mockAuthToken();
    mockPaymentStatusResponse(200, { status: 'Failed', reference: 'RC-1234-1234-1343-1234' });

    await request(app)
      .get(`${routeUrl}?token=${encodeURIComponent(token)}`)
      .expect((res) => {
        expect(res.status).to.equal(200);
        expect(res.text).to.contain('There is a problem');
      });
  });

  test('renders error page content when PayHub call fails', async () => {
    const token = buildToken();
    mockAuthToken();
    mockPaymentStatusResponse(500, { message: 'failure' });

    await request(app)
      .get(`${routeUrl}?token=${encodeURIComponent(token)}`)
      .expect((res) => {
        expect(res.status).to.equal(200);
        expect(res.text).to.contain('There is a problem');
      });
  });

  test('returns 404 for unknown route', async () => {
    await request(app)
      .get('/payment/some-id/confirmat')
      .expect((res) => expect(res.status).to.equal(404));
  });
});
