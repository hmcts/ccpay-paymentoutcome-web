import routeInit from '../../../main/routes/home';
import { PayhubService } from '../../../main/app/payhub/payhubService';

jest.mock('../../../main/app/payhub/payhubService', () => ({
  PayhubService: {
    getPaymentStatus: jest.fn(),
  },
}));

describe('home route default export', () => {
  const paymentId = '123e4567-e89b-42d3-a456-426614174000';
  const sessionCookieName = 'SESSION_ID';
  const validAuth = 'Bearer test-user-token';

  const getHandler = () => {
    const app: any = { get: jest.fn() };
    routeInit(app);
    expect(app.get).toHaveBeenCalledTimes(1);
    expect(app.get.mock.calls[0][0]).toBe('/payment/:id/confirmation');
    return app.get.mock.calls[0][1];
  };

  const buildRes = () => {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      render: jest.fn().mockReturnThis(),
    };
    return res;
  };

  const flush = async () => Promise.resolve();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when session cookie is missing', () => {
    const handler = getHandler();
    const req: any = {
      params: { id: paymentId },
      cookies: {},
      get: jest.fn(),
      url: `/payment/${paymentId}/confirmation`,
    };
    const res = buildRes();

    handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Unauthorized');
  });

  it('returns 400 when payment id is invalid', () => {
    const handler = getHandler();
    const req: any = {
      params: { id: 'not-a-uuid' },
      cookies: { [sessionCookieName]: 'session-id' },
      get: jest.fn().mockReturnValue(validAuth),
      url: '/payment/not-a-uuid/confirmation',
    };
    const res = buildRes();

    handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Invalid payment reference');
  });

  it('returns 401 when authorization header is invalid', () => {
    const handler = getHandler();
    const req: any = {
      params: { id: paymentId },
      cookies: { [sessionCookieName]: 'session-id' },
      get: jest.fn().mockReturnValue('Token abc'),
      url: `/payment/${paymentId}/confirmation`,
    };
    const res = buildRes();

    handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Unauthorized');
  });

  it('renders success template when payment status is Success', async () => {
    (PayhubService.getPaymentStatus as jest.Mock).mockResolvedValue({
      status: 'Success',
      reference: 'RC-1234-1234-1343-1234',
    });

    const handler = getHandler();
    const req: any = {
      params: { id: paymentId },
      cookies: { [sessionCookieName]: 'session-id' },
      get: jest.fn().mockReturnValue(validAuth),
      url: `/payment/${paymentId}/confirmation`,
    };
    const res = buildRes();

    handler(req, res);
    await flush();

    expect(res.render).toHaveBeenCalledWith('home', {
      error: false,
      result: { status: 'Success', reference: 'RC-1234-1234-1343-1234' },
      url: 'https://manage-case.platform.hmcts.net/cases/case-details',
    });
  });

  it('renders error template in Welsh when language=cy', async () => {
    (PayhubService.getPaymentStatus as jest.Mock).mockResolvedValue({
      status: 'Failed',
      reference: 'RC-1234-1234-1343-1234',
    });

    const handler = getHandler();
    const req: any = {
      params: { id: paymentId },
      cookies: { [sessionCookieName]: 'session-id' },
      get: jest.fn().mockReturnValue(validAuth),
      url: `/payment/${paymentId}/confirmation?language=cy`,
    };
    const res = buildRes();

    handler(req, res);
    await flush();

    expect(res.render).toHaveBeenCalledWith('home-welsh', {
      error: true,
      result: { status: 'Failed', reference: 'RC-1234-1234-1343-1234' },
      url: 'https://manage-case.platform.hmcts.net/cases/case-details',
    });
  });

  it('renders error template when payhub request fails', async () => {
    (PayhubService.getPaymentStatus as jest.Mock).mockRejectedValue(new Error('boom'));

    const handler = getHandler();
    const req: any = {
      params: { id: paymentId },
      cookies: { [sessionCookieName]: 'session-id' },
      get: jest.fn().mockReturnValue(validAuth),
      url: `/payment/${paymentId}/confirmation`,
    };
    const res = buildRes();

    handler(req, res);
    await flush();

    expect(res.render).toHaveBeenCalledWith('home', {
      error: true,
      result: [],
      url: 'https://manage-case.platform.hmcts.net/cases/case-details',
    });
  });
});
