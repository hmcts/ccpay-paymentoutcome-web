const loadErrorLogger = (getLoggerMock?: jest.Mock) => {
  jest.resetModules();

  if (getLoggerMock) {
    jest.doMock('@hmcts/nodejs-logging', () => ({
      Logger: {
        getLogger: getLoggerMock
      }
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../../../main/app/logging/errorLogger').ErrorLogger;
};

describe('ErrorLogger', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('uses default logger from @hmcts/nodejs-logging when logger is not supplied', () => {
    const defaultLogger = {
      error: jest.fn(),
      debug: jest.fn()
    };
    const getLoggerMock = jest.fn().mockReturnValue(defaultLogger);

    const ErrorLogger = loadErrorLogger(getLoggerMock);
    new ErrorLogger().log('boom');

    expect(getLoggerMock).toHaveBeenCalledWith('errorLogger.js');
    expect(defaultLogger.error).toHaveBeenNthCalledWith(1, 'boom');
    expect(defaultLogger.error).toHaveBeenNthCalledWith(2, JSON.stringify('boom'));
  });

  test('logs stack and serialized error when stack is present', () => {
    const ErrorLogger = loadErrorLogger();
    const logger = {
      error: jest.fn(),
      debug: jest.fn()
    };

    const err = { stack: 'sample stack', code: 'E_FAIL' };

    new ErrorLogger(logger).log(err);

    expect(logger.error).toHaveBeenNthCalledWith(1, 'sample stack');
    expect(logger.error).toHaveBeenNthCalledWith(2, JSON.stringify(err));
    expect(logger.debug).not.toHaveBeenCalled();
  });

  test('logs raw error value when stack is missing', () => {
    const ErrorLogger = loadErrorLogger();
    const logger = {
      error: jest.fn(),
      debug: jest.fn()
    };

    new ErrorLogger(logger).log('boom');

    expect(logger.error).toHaveBeenNthCalledWith(1, 'boom');
    expect(logger.error).toHaveBeenNthCalledWith(2, JSON.stringify('boom'));
    expect(logger.debug).not.toHaveBeenCalled();
  });

  test('logs debug message when error is blank', () => {
    const ErrorLogger = loadErrorLogger();
    const logger = {
      error: jest.fn(),
      debug: jest.fn()
    };

    new ErrorLogger(logger).log(undefined);

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith('Received error was blank');
  });
});
