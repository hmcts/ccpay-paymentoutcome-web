type AppInsightsMock = {
  setup: jest.Mock;
  setSendLiveMetrics: jest.Mock;
  start: jest.Mock;
  trackTrace: jest.Mock;
  tags: Record<string, string>;
};

const createMocks = (): AppInsightsMock => {
  const start = jest.fn();
  const setSendLiveMetrics = jest.fn().mockReturnValue({ start });
  const setup = jest.fn().mockReturnValue({ setSendLiveMetrics });
  const trackTrace = jest.fn();
  const tags: Record<string, string> = {};

  return {
    setup,
    setSendLiveMetrics,
    start,
    trackTrace,
    tags
  };
};

describe('app insights bootstrap', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('does nothing when connection string is missing', () => {
    const mocks = createMocks();

    jest.doMock('config', () => ({
      get: jest.fn().mockReturnValue(false)
    }));
    jest.doMock('applicationinsights', () => ({
      setup: mocks.setup,
      defaultClient: {
        context: {
          tags: mocks.tags,
          keys: { cloudRole: 'cloudRole' }
        },
        trackTrace: mocks.trackTrace
      }
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

    expect(mocks.setup).not.toHaveBeenCalled();
  });

  it('starts application insights and sets cloud role when connection string exists', () => {
    const mocks = createMocks();

    jest.doMock('config', () => ({
      get: jest.fn().mockReturnValue('InstrumentationKey=test-key;IngestionEndpoint=https://test/')
    }));
    jest.doMock('applicationinsights', () => ({
      setup: mocks.setup,
      defaultClient: {
        context: {
          tags: mocks.tags,
          keys: { cloudRole: 'cloudRole' }
        },
        trackTrace: mocks.trackTrace
      }
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

    expect(mocks.setup).toHaveBeenCalledWith('InstrumentationKey=test-key;IngestionEndpoint=https://test/');
    expect(mocks.setSendLiveMetrics).toHaveBeenCalledWith(true);
    expect(mocks.start).toHaveBeenCalled();
    expect(mocks.tags.cloudRole).toBe('rpe-expressjs-template');
    expect(mocks.trackTrace).toHaveBeenCalledWith({ message: 'App insights activated' });
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
