import { expect } from 'chai';
import nock from 'nock';
import config from 'config';

import { PayhubService } from '../../../main/app/payhub/payhubService';
import * as feesServiceMock from '../../http-mocks/fees';

const payhubUrl = config.get<string>('payhub.url');
const s2sUrl = config.get<string>('s2s.url');

describe('payhub service', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('on GET payment status', () => {
    it('should return the data when the server replies', async () => {
      feesServiceMock.resolveCreateToken();
      feesServiceMock.resolveGetPaymentStatus('sdfasdfasdfasdfgswdfawef');
      const response = await PayhubService.getPaymentStatus('sdfasdfasdfasdfgswdfawef', 'Bearer test-user-token');
      expect(response).to.not.equal(null);
    });

    it('should throw when payhub returns a non-2xx response', async () => {
      nock(s2sUrl).post('/lease').reply(200, 'token');
      nock(payhubUrl).get(/.*/).reply(500, { message: 'boom' });

      try {
        await PayhubService.getPaymentStatus('sdfasdfasdfasdfgswdfawef', 'Bearer test-user-token');
        expect.fail('Expected getPaymentStatus to throw');
      } catch (error: any) {
        expect(error.message).to.contain('Failed to fetch payment status');
      }
    });
  });

  describe('on GET s2s token', () => {
    it('should return the s2s token when the server replies', async () => {
      feesServiceMock.resolveCreateToken();
      const token = await PayhubService.createAuthToken();
      expect(token).to.equal('token');
    });

    it('should throw when s2s token endpoint returns a non-2xx response', async () => {
      nock(s2sUrl).post('/lease').reply(401, 'Unauthorized');

      try {
        await PayhubService.createAuthToken();
        expect.fail('Expected createAuthToken to throw');
      } catch (error: any) {
        expect(error.message).to.contain('Failed to get auth token');
      }
    });
  });
});
