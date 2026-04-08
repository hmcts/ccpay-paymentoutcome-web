describe('wrapped fetch client', () => {
  afterEach(() => {
    jest.resetModules();
    jest.useRealTimers();
    delete process.env.NODE_ENV;
  });

  it('passes through options and returns fetch result', async () => {
    process.env.NODE_ENV = 'development';
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    jest.doMock('node-fetch', () => fetchMock);

    const wrappedFetch = require('../../../main/app/client/request').default;
    const response = await wrappedFetch('http://example.org', { method: 'GET' });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('http://example.org');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'GET' });
    expect(fetchMock.mock.calls[0][1].signal).toBeDefined();
  });

  it('rethrows non-timeout errors', async () => {
    process.env.NODE_ENV = 'development';
    const fetchError = new Error('boom');
    const fetchMock = jest.fn().mockRejectedValue(fetchError);
    jest.doMock('node-fetch', () => fetchMock);

    const wrappedFetch = require('../../../main/app/client/request').default;

    await expect(wrappedFetch('http://example.org')).rejects.toThrow('boom');
  });

  it('throws timeout error when request aborts in production mode', async () => {
    jest.useFakeTimers();
    process.env.NODE_ENV = 'production';

    const fetchMock = jest.fn((url: string, options: any) => {
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const abortError: any = new Error(`request aborted for ${url}`);
          abortError.name = 'AbortError';
          reject(abortError);
        });
      });
    });
    jest.doMock('node-fetch', () => fetchMock);

    const wrappedFetch = require('../../../main/app/client/request').default;
    const promise = wrappedFetch('http://example.org');

    jest.advanceTimersByTime(4500);

    await expect(promise).rejects.toThrow('Request to http://example.org timed out after 4500ms');
  });
});
