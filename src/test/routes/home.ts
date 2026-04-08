import { expect } from 'chai';
import request from 'supertest';
import config from 'config';

import { app } from '../../main/app';

// TODO: replace this sample test with proper route tests for your application
describe('Home page', () => {
  const paymentId = '123e4567-e89b-42d3-a456-426614174000';
  const sessionCookieName: string = config.get<string>('session.cookieName');
  const sessionCookie = `${sessionCookieName}=test-session-id`;
  const userAuthorization = 'Bearer test-user-token';

  describe('on GET', () => {
    test('should return sample home page', async () => {
      await request(app)
        .get(`/payment/${paymentId}/confirmation`)
        .set('Cookie', sessionCookie)
        .set('Authorization', userAuthorization)
        .expect((res) => expect(res.status).to.equal(200));
    });
  });

  describe('on GET with authentication cookie but no user authorization header', () => {
    test('should return unauthorized', async () => {
      await request(app)
        .get(`/payment/${paymentId}/confirmation`)
        .set('Cookie', sessionCookie)
        .expect((res) => expect(res.status).to.equal(401));
    });
  });

  describe('on GET without authentication cookie', () => {
    test('should return unauthorized', async () => {
      await request(app)
        .get(`/payment/${paymentId}/confirmation`)
        .set('Authorization', userAuthorization)
        .expect((res) => expect(res.status).to.equal(401));
    });
  });

  describe('on GET', () => {
    test('should return sample error page', async () => {
      await request(app)
        .get('/payment/:id/confirmat')
        .expect((res) => expect(res.status).to.equal(404));
    });
  });
});
