import { expect } from 'chai';

import { PayhubService } from '../../../main/app/payhub/payhubService';
import * as feesServiceMock from '../../http-mocks/fees'

describe('payhub service', () => {

  describe('normalizeAuthHeader', () => {
    it('returns empty string when tokenOrHeader is falsy', () => {
      const res = (PayhubService as any).normalizeAuthHeader('');
      expect(res).to.equal('');
    });

    it('returns same header when already Bearer-prefixed', () => {
      const res = (PayhubService as any).normalizeAuthHeader('Bearer abc123');
      expect(res).to.equal('Bearer abc123');
    });

    it('adds Bearer when given raw token', () => {
      const res = (PayhubService as any).normalizeAuthHeader('abc123');
      expect(res).to.equal('Bearer abc123');
    });
  });

  describe('on GET payment status', () => {
    it('should return the data when the server replies', async () => {
      feesServiceMock.resolveValidateUserToken()
      feesServiceMock.resolveCreateToken()
      feesServiceMock.resolveGetPaymentStatus('sdfasdfasdfasdfgswdfawef');
      expect(PayhubService.getPaymentStatus('sdfasdfasdfasdfgswdfawef', 'Bearer test-user-auth')).to.not.equal(null)
    })
  })



  describe('on validate user token', () => {
    it('should return a valid response when the server replies', async () => {
      feesServiceMock.resolveValidateUserToken()
      const res = await PayhubService.validateUserToken('Bearer test-user-auth');
      expect(res).to.not.equal(null);
    })

    it('should throw when server responds OK but with empty body', async () => {
      feesServiceMock.resolveValidateUserTokenWithEmptyBody()
      try {
        await PayhubService.validateUserToken('Bearer test-user-auth');
        throw new Error('Expected validateUserToken to throw when body is empty');
      } catch (err) {
        expect(err).to.not.equal(null);
      }
    })

    it('should throw when server responds with non-OK (401) status', async () => {
      feesServiceMock.resolveValidateUserTokenWith401();
      try {
        await PayhubService.validateUserToken('Bearer test-user-auth');
        throw new Error('Expected validateUserToken to throw when response is 401');
      } catch (err) {
        expect(err).to.not.equal(null);
      }
    })
  })

  describe('on GET s2s token ', () => {
    it('should return the s2s token when the server replies', async () => {
      feesServiceMock.resolveCreateToken()
      expect(PayhubService.createAuthToken()).to.not.equal(null)
    })
  })
})
