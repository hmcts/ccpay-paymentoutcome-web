import { expect } from 'chai';
import sinon from 'sinon';
import { ApiLogger } from '../../../main/app/logging/apiLogger';

describe('api logger', () => {
  let logger: any;
  let apiLogger: ApiLogger;

  beforeEach(() => {
    logger = {
      debug: sinon.spy(),
      warn: sinon.spy(),
      error: sinon.spy(),
    };
    apiLogger = new ApiLogger(logger);
  });

  it('logs a request with query and body', () => {
    apiLogger.logRequest({
      method: 'GET',
      uri: '/path',
      query: { a: 1 },
      requestBody: { foo: 'bar' },
    });

    expect(logger.debug.calledOnce).to.equal(true);
    expect(logger.debug.firstCall.args[0].message).to.equal('API: GET /path | Query: {"a":1} | Body: {"foo":"bar"} ');
  });

  it('builds response entry without optional fields', () => {
    const entry = apiLogger._buildResponseEntry({
      uri: '/path',
      responseCode: 204,
    });

    expect(entry.message).to.equal('API: Response 204 from /path ');
    expect(entry.responseCode).to.equal(204);
  });

  it('logs response at debug level for 2xx', () => {
    apiLogger.logResponse({
      uri: '/path',
      responseCode: 200,
      responseBody: { ok: true },
    });

    expect(logger.debug.calledOnce).to.equal(true);
    expect(logger.warn.called).to.equal(false);
    expect(logger.error.called).to.equal(false);
  });

  it('logs response at warn level for 4xx', () => {
    apiLogger.logResponse({
      uri: '/path',
      responseCode: 404,
      error: 'missing',
    });

    expect(logger.warn.calledOnce).to.equal(true);
    expect(logger.debug.called).to.equal(false);
    expect(logger.error.called).to.equal(false);
  });

  it('logs response at error level for 5xx', () => {
    apiLogger.logResponse({
      uri: '/path',
      responseCode: 500,
      error: { message: 'boom' },
    });

    expect(logger.error.calledOnce).to.equal(true);
    expect(logger.debug.called).to.equal(false);
    expect(logger.warn.called).to.equal(false);
  });

  it('stringifies objects and keeps primitives', () => {
    expect(apiLogger._stringifyObject({ a: 1 })).to.equal('{"a":1}');
    expect(apiLogger._stringifyObject(null)).to.equal(null);
    expect(apiLogger._stringifyObject('abc')).to.equal('abc');
  });
});
