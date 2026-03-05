import { TextEncoder, TextDecoder } from 'util';
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
import { expect } from 'chai';
import request from 'supertest';
import * as mock from 'nock';
import * as feesServiceMock from '../../http-mocks/fees';
import { app } from '../../../main/app';
import { PaymentConfirmationTokenService } from '../../../main/app/security/paymentConfirmationToken';

const paymentId = '234dw23ds34';
const token = PaymentConfirmationTokenService.createToken({
  paymentId,
  payerReference: 'RC-1234-1234-1343-1234',
  exp: Math.floor(Date.now() / 1000) + 300,
});
const PAGE_URL = `/payment/${paymentId}/confirmation?token=${encodeURIComponent(token)}`;
const headingClass = 'govuk-error-summary__title';

function buildToken(overrides: any = {}): string {
  return PaymentConfirmationTokenService.createToken({
    paymentId,
    payerReference: 'RC-1234-1234-1343-1234',
    exp: Math.floor(Date.now() / 1000) + 300,
    ...overrides,
  });
}

let htmlRes: Document;

describe('Fee edit page', () => {
  beforeEach(() => {
    mock.cleanAll();
  });


  describe('Home page error flow', () => {
    beforeAll(async () => {
      await request(app).get(PAGE_URL).then(res => {
        htmlRes = new DOMParser().parseFromString(res.text, 'text/html');
      });
    });

    it('should display error header',  () => {
      const header = htmlRes.getElementsByClassName(headingClass);
      expect(header[0].innerHTML).contains('There is a problem');
    });

    it('should display error body text',  () => {
      const header = htmlRes.getElementsByClassName('govuk-list');
      expect(header[0].innerHTML).contains('Your card payment was unsuccessful.');
    });
  });


  describe('Home page success-error flow', () => {
    beforeAll(async () => {
      feesServiceMock.resolveGetPaymentStatus('error');
      feesServiceMock.resolveCreateToken();
      await request(app).get(PAGE_URL).then(res => {
        htmlRes = new DOMParser().parseFromString(res.text, 'text/html');
      });
    });

    it('should display error header',  () => {
      const header = htmlRes.getElementsByClassName(headingClass);
      expect(header[0].innerHTML).contains('There is a problem');
    });

    it('should display error body text',  () => {
      const header = htmlRes.getElementsByClassName('govuk-list');
      expect(header[0].innerHTML).contains('Your card payment was unsuccessful.');
    });
  });


  describe('Home page success flow', () => {
    beforeAll(async () => {
      feesServiceMock.resolveGetPaymentStatus('Success');
      feesServiceMock.resolveCreateToken();
      await request(app).get(PAGE_URL).then(res => {
        htmlRes = new DOMParser().parseFromString(res.text, 'text/html');
      });
    });

    it('should display success title',  () => {
      const header = htmlRes.getElementsByClassName('govuk-panel__title');
      expect(header[0].innerHTML).contains('Payment successful');
    });

    it('should display error body text',  () => {
      const header = htmlRes.getElementsByClassName('govuk-panel__body');
      expect(header[0].innerHTML).contains('Your payment reference is<br><strong>RC-1234-1234-1343-1234</strong>');
    });
  });


  describe('Home page authorization checks', () => {
    it('should return 403 when case number claim does not match payment data', async () => {
      feesServiceMock.resolveGetPaymentStatus('Success');
      feesServiceMock.resolveCreateToken();
      const mismatchedCaseToken = buildToken({ caseNumber: '1111222233334444' });

      await request(app)
        .get(`/payment/${paymentId}/confirmation?token=${encodeURIComponent(mismatchedCaseToken)}`)
        .expect((res) => expect(res.status).to.equal(403));
    });

    it('should return 403 when payer reference claim does not match payment data', async () => {
      feesServiceMock.resolveGetPaymentStatus('Success');
      feesServiceMock.resolveCreateToken();
      const mismatchedPayerToken = buildToken({ payerReference: 'RC-9999-9999-9999-9999' });

      await request(app)
        .get(`/payment/${paymentId}/confirmation?token=${encodeURIComponent(mismatchedPayerToken)}`)
        .expect((res) => expect(res.status).to.equal(403));
    });
  });


  describe('Home page branch coverage checks', () => {
    it('should render Welsh content when language query param is cy', async () => {
      feesServiceMock.resolveGetPaymentStatus('Success');
      feesServiceMock.resolveCreateToken();

      await request(app)
        .get(`${PAGE_URL}&language=cy`)
        .expect((res) => {
          expect(res.status).to.equal(200);
          expect(res.text).contains('Taliad yn llwyddiannus');
        });
    });

    it('should return 403 when token is missing', async () => {
      await request(app)
        .get(`/payment/${paymentId}/confirmation`)
        .expect((res) => expect(res.status).to.equal(403));
    });
  });
});
