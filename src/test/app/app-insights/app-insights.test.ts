type AppInsightsMock = {
  setup: jest.Mock;
  setAutoDependencyCorrelation: jest.Mock;
  setAutoCollectConsole: jest.Mock;
  setSendLiveMetrics: jest.Mock;
  setAzureMonitorOptions: jest.Mock;
  start: jest.Mock;
  tags: Record<string, string>;
};

const connectionString = 'InstrumentationKey=test-key;IngestionEndpoint=https://test/';

const createMocks = (): AppInsightsMock => {
  const start = jest.fn();
  const setAzureMonitorOptions = jest.fn().mockReturnValue({ start });
  const setSendLiveMetrics = jest.fn().mockReturnValue({ setAzureMonitorOptions });
  const setAutoCollectConsole = jest.fn().mockReturnValue({ setSendLiveMetrics });
  const setAutoDependencyCorrelation = jest.fn().mockReturnValue({ setAutoCollectConsole });
  const setup = jest.fn().mockReturnValue({ setAutoDependencyCorrelation });
  const tags: Record<string, string> = {};

  return {
    setup,
    setAutoDependencyCorrelation,
    setAutoCollectConsole,
    setSendLiveMetrics,
    setAzureMonitorOptions,
    start,
    tags
  };
};

const mockConfig = (value: unknown) => ({
  get: jest.fn().mockReturnValue(value)
});

const loadAppInsights = () => {
  jest.isolateModules(() => {
    const enableAppInsights = require('../../../main/app-insights/app-insights');
    enableAppInsights();
  });
};

describe('app insights bootstrap', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    delete process.env.OTEL_SERVICE_NAME;
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['placeholder GUID', 'InstrumentationKey=00000000-0000-0000-0000-000000000000'],
    ['not a connection string', 'some-other-value']
  ])('does not start when connection string is %s', (_label, value) => {
    const mocks = createMocks();

    jest.doMock('config', () => mockConfig(value));
    jest.doMock('applicationinsights', () => ({
      setup: mocks.setup
    }));
    jest.doMock('@hmcts/nodejs-logging', () => ({
      Logger: {
        getLogger: () => ({ info: jest.fn(), warn: jest.fn() })
      }
    }));

    loadAppInsights();

    expect(mocks.setup).not.toHaveBeenCalled();
    expect(mocks.start).not.toHaveBeenCalled();
  });

  it('starts application insights and sets env bindings when a valid connection string exists', () => {
    const mocks = createMocks();

    jest.doMock('config', () => mockConfig(connectionString));
    jest.doMock('applicationinsights', () => ({
      setup: mocks.setup,
      start: mocks.start
    }));
    jest.doMock('@hmcts/nodejs-logging', () => ({
      Logger: {
        getLogger: () => ({ info: jest.fn(), warn: jest.fn() })
      }
    }));

    loadAppInsights();

    expect(mocks.setup).toHaveBeenCalledWith();
    expect(mocks.setAutoDependencyCorrelation).toHaveBeenCalledWith(true);
    expect(mocks.setAutoCollectConsole).toHaveBeenCalledWith(true, true);
    expect(mocks.setSendLiveMetrics).toHaveBeenCalledWith(true);
    expect(mocks.start).toHaveBeenCalled();
    expect(process.env.OTEL_SERVICE_NAME).toBe('ccpay-paymentoutcome-web');
    expect(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING).toBe(connectionString);
  });

  it('configures always-on sampling and health request suppression', () => {
    const mocks = createMocks();

    jest.doMock('config', () => mockConfig(connectionString));
    jest.doMock('applicationinsights', () => ({
      setup: mocks.setup,
      start: mocks.start
    }));
    jest.doMock('@hmcts/nodejs-logging', () => ({
      Logger: {
        getLogger: () => ({ info: jest.fn(), warn: jest.fn() })
      }
    }));

    loadAppInsights();

    expect(mocks.setAzureMonitorOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        samplingRatio: 1,
        tracesPerSecond: 0,
        instrumentationOptions: expect.objectContaining({
          http: expect.objectContaining({
            enabled: true,
            ignoreIncomingRequestHook: expect.any(Function)
          })
        })
      })
    );
  });

  it('returns early for non-health requests in the ignore hook', () => {
    const mocks = createMocks();

    jest.doMock('config', () => mockConfig(connectionString));
    jest.doMock('applicationinsights', () => ({
      setup: mocks.setup,
      start: mocks.start
    }));
    jest.doMock('@hmcts/nodejs-logging', () => ({
      Logger: {
        getLogger: () => ({ info: jest.fn(), warn: jest.fn() })
      }
    }));

    loadAppInsights();

    const options = mocks.setAzureMonitorOptions.mock.calls[0][0];
    const hook = options.instrumentationOptions.http.ignoreIncomingRequestHook;

    expect(hook({ url: '/login' })).toBe(false);
  });

  it.each([
    ['/health', true],
    ['/health/liveness', true],
    ['/health/readiness', true]
  ])('suppresses health request spans in the ignore hook (%s)', (path, shouldIgnore) => {
    const mocks = createMocks();

    jest.doMock('config', () => mockConfig(connectionString));
    jest.doMock('applicationinsights', () => ({
      setup: mocks.setup,
      start: mocks.start
    }));
    jest.doMock('node:crypto', () => ({
      randomInt: jest.fn().mockReturnValue(1)
    }));
    jest.doMock('@hmcts/nodejs-logging', () => ({
      Logger: {
        getLogger: () => ({ info: jest.fn(), warn: jest.fn() })
      }
    }));

    loadAppInsights();

    const options = mocks.setAzureMonitorOptions.mock.calls[0][0];
    const hook = options.instrumentationOptions.http.ignoreIncomingRequestHook;

    expect(hook({ url: path })).toBe(shouldIgnore);
  });

  it('keeps 1 in 100 health request spans', () => {
    const mocks = createMocks();

    jest.doMock('config', () => mockConfig(connectionString));
    jest.doMock('applicationinsights', () => ({
      setup: mocks.setup,
      start: mocks.start
    }));
    jest.doMock('node:crypto', () => ({
      randomInt: jest.fn().mockReturnValue(0)
    }));
    jest.doMock('@hmcts/nodejs-logging', () => ({
      Logger: {
        getLogger: () => ({ info: jest.fn(), warn: jest.fn() })
      }
    }));

    loadAppInsights();

    const options = mocks.setAzureMonitorOptions.mock.calls[0][0];
    const hook = options.instrumentationOptions.http.ignoreIncomingRequestHook;

    expect(hook({ url: '/health' })).toBe(false);
  });

  it('logs a warning and continues if setup throws', () => {
    const warnMock = jest.fn();
    const setupMock = jest.fn(() => {
      throw new Error('failed');
    });

    jest.doMock('config', () => mockConfig(connectionString));
    jest.doMock('applicationinsights', () => ({
      setup: setupMock
    }));
    jest.doMock('@hmcts/nodejs-logging', () => ({
      Logger: {
        getLogger: () => ({ info: jest.fn(), warn: warnMock })
      }
    }));

    loadAppInsights();

    expect(warnMock).toHaveBeenCalled();
  });

  it('exposes the raw connection string via environment variable', () => {
    jest.doMock('config', () => mockConfig('InstrumentationKey=test-key'));
    jest.doMock('applicationinsights', () => ({
      setup: jest.fn().mockReturnValue({
        setAutoDependencyCorrelation: jest.fn().mockReturnValue({
          setAutoCollectConsole: jest.fn().mockReturnValue({
            setSendLiveMetrics: jest.fn().mockReturnValue({ start: jest.fn() })
          })
        })
      })
    }));
    jest.doMock('@hmcts/nodejs-logging', () => ({
      Logger: { getLogger: () => ({ info: jest.fn(), warn: jest.fn() }) }
    }));

    loadAppInsights();

    expect(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING).toBe('InstrumentationKey=test-key');
  });
});