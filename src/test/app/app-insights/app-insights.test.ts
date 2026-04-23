describe('app insights bootstrap', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('does nothing when connection string is missing', () => {
    const setupMock = jest.fn();

    jest.doMock('config', () => ({
      get: jest.fn().mockReturnValue(false)
    }));
    jest.doMock('applicationinsights', () => ({
      setup: setupMock
    }));
    jest.doMock('@hmcts/nodejs-logging', () => ({
      Logger: {
        getLogger: () => ({ info: jest.fn(), warn: jest.fn() })
      }
    }));

    jest.isolateModules(() => {
      const enableAppInsights = require('../../../main/app-insights/app-insights');
      enableAppInsights();
    });

    expect(setupMock).not.toHaveBeenCalled();
  });

  it('starts application insights when connection string exists', () => {
    const startMock = jest.fn();
    const setupMock = jest.fn().mockReturnValue({ start: startMock });

    jest.doMock('config', () => ({
      get: jest.fn().mockReturnValue('InstrumentationKey=test-key;IngestionEndpoint=https://test/')
    }));
    jest.doMock('applicationinsights', () => ({
      setup: setupMock
    }));
    jest.doMock('@hmcts/nodejs-logging', () => ({
      Logger: {
        getLogger: () => ({ info: jest.fn(), warn: jest.fn() })
      }
    }));

    jest.isolateModules(() => {
      const enableAppInsights = require('../../../main/app-insights/app-insights');
      enableAppInsights();
    });

    expect(setupMock).toHaveBeenCalledWith('InstrumentationKey=test-key;IngestionEndpoint=https://test/');
    expect(startMock).toHaveBeenCalled();
  });

  it('logs a warning and continues if setup throws', () => {
    const warnMock = jest.fn();
    const setupMock = jest.fn(() => {
      throw new Error('failed');
    });

    jest.doMock('config', () => ({
      get: jest.fn().mockReturnValue('InstrumentationKey=test-key;IngestionEndpoint=https://test/')
    }));
    jest.doMock('applicationinsights', () => ({
      setup: setupMock
    }));
    jest.doMock('@hmcts/nodejs-logging', () => ({
      Logger: {
        getLogger: () => ({ info: jest.fn(), warn: warnMock })
      }
    }));

    jest.isolateModules(() => {
      const enableAppInsights = require('../../../main/app-insights/app-insights');
      enableAppInsights();
    });

    expect(warnMock).toHaveBeenCalled();
  });
});

