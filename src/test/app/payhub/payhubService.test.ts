import { expect } from 'chai';

import { PayhubService } from '../../../main/app/payhub/payhubService';
import * as feesServiceMock from '../../http-mocks/fees'

describe('payhub service', () => {

  describe('on GET payment status', () => {
    it('should return the data when the server replies', async () => {
      feesServiceMock.resolveCreateToken()
      feesServiceMock.resolveGetPaymentStatus('sdfasdfasdfasdfgswdfawef');
      expect(PayhubService.getPaymentStatus('sdfasdfasdfasdfgswdfawef', 'Bearer test-user-token')).to.not.equal(null)
    })
  })
  describe('on GET s2s token ', () => {
    it('should return the s2s token when the server replies', async () => {
      feesServiceMock.resolveCreateToken()
      expect(PayhubService.createAuthToken()).to.not.equal(null)
    })
  })
})
