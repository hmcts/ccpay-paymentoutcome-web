import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);
import { RequestLoggingHandler } from '../../../main/app/logging/requestPromiseLoggingHandler';
import sinon from 'sinon';

const fakeUri = 'http://example.org';

describe('request logging handler', () => {

  let mockApiLogger: any;
  let requestLoggingHandler: RequestLoggingHandler;

  beforeEach(() => {
    mockApiLogger = {
      logRequest: sinon.spy(),
      logResponse: sinon.spy(),
    };
    requestLoggingHandler = new RequestLoggingHandler(mockApiLogger);
  });

  it('should call logRequest, then invoke the target, and return its result', () => {
    const fakeGet = sinon.stub().returns('FAKE_RESULT');
    Object.defineProperty(fakeGet, 'name', { value: 'get' });

    const options = {
      uri: fakeUri,
      body: { body: 'meat' },
      qs: { q: 'queryX' },
      callback: () => {},
    };

    const returnValue = requestLoggingHandler.apply(fakeGet, null, [options]);

    expect(mockApiLogger.logRequest).to.have.been.calledOnceWithExactly({
      method: 'GET',
      uri: fakeUri,
      requestBody: options.body,
      query:      options.qs,
    });

    expect(fakeGet).to.have.been.calledOnceWithExactly(options);
    expect(returnValue).to.equal('FAKE_RESULT');
  });


  it('should not log or wrap non-HTTP methods', () => {
    const fakeFn = sinon.stub().returns(123);
    Object.defineProperty(fakeFn, 'name', { value: 'notAHttpMethod' });

    const options = { foo: 'bar' };
    const result = requestLoggingHandler.apply(fakeFn, null, [options]);

    expect(mockApiLogger.logRequest).to.not.have.been.called;
    expect(fakeFn).to.have.been.calledOnceWithExactly(options);
    expect(result).to.equal(123);
  });

  it('should log request and response', () => {
    const options = {
      callback: jest.fn(),
      uri: fakeUri,
      body: 'empty',
      qs: 'empty',
    };

    requestLoggingHandler.handleLogging('GET', options);

    expect(mockApiLogger.logRequest).to.have.been.calledOnceWithExactly({
      method: 'GET',
      uri: fakeUri,
      requestBody: 'empty',
      query: 'empty',
    });


    const responseObj = { statusCode: 200 };
    const responseBody = 'responseBody';
    options.callback(null, responseObj, responseBody);

    expect(mockApiLogger.logResponse).to.have.been.calledOnceWithExactly({
      uri: fakeUri,
      responseCode: 200,
      responseBody: 'responseBody',
      error: null,
    });

  });
});
