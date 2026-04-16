import { expect } from 'chai';
import mock from 'nock';
import request from 'supertest';

import { app } from '../../main/app';
import {
  rejectGetPaymentStatus,
  resolveCreateToken,
  resolveGetPaymentStatusWithStatus
} from '../http-mocks/fees';

describe('Home page', () => {
  beforeEach(() => {
    mock.cleanAll();
    resolveCreateToken();
  });

  afterEach(() => {
    mock.cleanAll();
  });

  describe('on GET /payment/:id/confirmation', () => {
    test('returns 401 when Authorization header is missing', async () => {
      // Should not call upstream services when unauthenticated
      await request(app)
        .get('/payment/466d7ea8-793b-4417-b4d7-a35b6b1a2fd6/confirmation?language=en')
        .expect((res) => {
          expect(res.status).to.equal(401);
          expect(res.text).to.contain('There is a problem');
          expect(res.text).to.contain('Your card payment was unsuccessful.');
        });
    });

    test('returns 400 when payment id is not a valid UUID', async () => {
      await request(app)
        .get('/payment/not-a-uuid/confirmation?language=en')
        .set('Authorization', 'Bearer test-user-token')
        .expect((res) => {
          expect(res.status).to.equal(400);
          expect(res.text).to.contain('There is a problem');
          expect(res.text).to.contain('Your card payment was unsuccessful.');
        });
    });

    test('renders English success page when payment status is Success', async () => {
      resolveGetPaymentStatusWithStatus('Success');

      await request(app)
        .get('/payment/466d7ea8-793b-4417-b4d7-a35b6b1a2fd6/confirmation?language=en')
        .set('Authorization', 'Bearer test-user-token')
        .expect((res) => {
          expect(res.status).to.equal(200);
          expect(res.text).to.contain('Payment successful');
          expect(res.text).to.contain('RC-1234-1234-1343-1234');
          expect(res.text).to.contain('https://manage-case.platform.hmcts.net/cases/case-details/1234123412341234#Service Request');
        });
    });

    test('renders Welsh success page when language is cy', async () => {
      resolveGetPaymentStatusWithStatus('Success');

      await request(app)
        .get('/payment/466d7ea8-793b-4417-b4d7-a35b6b1a2fd6/confirmation?language=cy')
        .set('Authorization', 'Bearer test-user-token')
        .expect((res) => {
          expect(res.status).to.equal(200);
          expect(res.text).to.contain('Taliad yn llwyddiannus');
          expect(res.text).to.contain('Dychwelyd i gais gwasanaeth');
        });
    });

    test('renders error summary when payment status is not Success', async () => {
      resolveGetPaymentStatusWithStatus('Failed');

      await request(app)
        .get('/payment/466d7ea8-793b-4417-b4d7-a35b6b1a2fd6/confirmation?language=en')
        .set('Authorization', 'Bearer test-user-token')
        .expect((res) => {
          expect(res.status).to.equal(200);
          expect(res.text).to.contain('There is a problem');
          expect(res.text).to.contain('Your card payment was unsuccessful.');
        });
    });

    test('renders English error summary when upstream payment API request fails', async () => {
      rejectGetPaymentStatus();

      await request(app)
        .get('/payment/466d7ea8-793b-4417-b4d7-a35b6b1a2fd6/confirmation?language=en')
        .set('Authorization', 'Bearer test-user-token')
        .expect((res) => {
          expect(res.status).to.equal(200);
          expect(res.text).to.contain('There is a problem');
          expect(res.text).to.contain('Your card payment was unsuccessful.');
        });
    });

    test('renders Welsh error summary when upstream payment API request fails', async () => {
      rejectGetPaymentStatus();

      await request(app)
        .get('/payment/466d7ea8-793b-4417-b4d7-a35b6b1a2fd6/confirmation?language=cy')
        .set('Authorization', 'Bearer test-user-token')
        .expect((res) => {
          expect(res.status).to.equal(200);
          expect(res.text).to.contain('Mae yna broblem');
          expect(res.text).to.contain('Roedd eich taliad cerdyn yn aflwyddiannus.');
        });
    });
  });

  describe('on GET unknown route', () => {
    test('returns not found page', async () => {
      await request(app)
        .get('/payment/466d7ea8-793b-4417-b4d7-a35b6b1a2fd6/confirmat')
        .expect((res) => expect(res.status).to.equal(404));
    });
  });
});
