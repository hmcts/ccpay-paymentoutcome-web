type AppInsightsMock = {
  setup: jest.Mock;
  setAutoDependencyCorrelation: jest.Mock;
  setAutoCollectConsole: jest.Mock;
  setSendLiveMetrics: jest.Mock;
  start: jest.Mock;
  tags: Record<string, string>;
};

const connectionString = 'InstrumentationKey=test-key;IngestionEndpoint=https://test/';

const createMocks = (): AppInsightsMock => {
  const start = jest.fn();
  const setSendLiveMetrics = jest.fn().mockReturnValue({ start });
  const setAutoCollectConsole = jest.fn().mockReturnValue({ setSendLiveMetrics });
  const setAutoDependencyCorrelation = jest.fn().mockReturnValue({ setAutoCollectConsole });
  const setup = jest.fn().mockReturnValue({ setAutoDependencyCorrelation });
  const tags: Record<string, string> = {};

  return {
    setup,
    setAutoDependencyCorrelation,
    setAutoCollectConsole,
    setSendLiveMetrics,
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

const appInsightsModuleMock = (appDefaultClient?: unknown) => {
  const start = jest.fn();
  const setup = jest.fn().mockReturnValue({
    setAutoDependencyCorrelation: jest.fn().mockReturnValue({
      setAutoCollectConsole: jest.fn().mockReturnValue({
        setSendLiveMetrics: jest.fn().mockReturnValue({ start })
      })
    })
  });

  return {
    setup,
    start,
    defaultClient: appDefaultClient
  };
};

const mockOtelDiagApi = () => {
  const setLogger = jest.fn();
  jest.doMock('@opentelemetry/api', () => ({
    diag: { setLogger },
    DiagConsoleLogger: class {},
    DiagLogLevel: { VERBOSE: 4 }
  }));
  return setLogger;
};

describe('app insights bootstrap', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
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
      setup: mocks.setup,
      defaultClient: {
        context: {
          tags: mocks.tags,
          keys: { cloudRole: 'cloudRole' }
        }
      }
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

  it('starts application insights and sets cloud role when a valid connection string exists', () => {
    const mocks = createMocks();
    mockOtelDiagApi();

    jest.doMock('config', () => mockConfig(connectionString));
    jest.doMock('applicationinsights', () => ({
      setup: mocks.setup,
      start: mocks.start,
      defaultClient: {
        context: {
          tags: mocks.tags,
          keys: { cloudRole: 'cloudRole' }
        }
      }
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
});

describe('app insights startup diagnostics', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('enables the otel diag logger and sends a canary', () => {
    const logger = { info: jest.fn(), warn: jest.fn() };
    const trackTrace = jest.fn();
    const diagSetLogger = mockOtelDiagApi();

    jest.doMock('config', () => mockConfig(
      'InstrumentationKey=test-key;IngestionEndpoint=https://ingest.test/;LiveEndpoint=https://live.test/'));
    jest.doMock('applicationinsights', () => appInsightsModuleMock({
      context: { tags: {}, keys: { cloudRole: 'cloudRole' } },
      trackTrace
    }));
    jest.doMock('@hmcts/nodejs-logging', () => ({
      Logger: { getLogger: () => logger }
    }));

    loadAppInsights();

    expect(diagSetLogger).toHaveBeenCalledTimes(1);
    expect(diagSetLogger.mock.calls[0][1]).toBe(4);
    expect(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
      .toBe('InstrumentationKey=test-key;IngestionEndpoint=https://ingest.test/;LiveEndpoint=https://live.test/');
    expect(trackTrace).toHaveBeenCalledWith({ message: 'ai-startup-canary' });
  });

  it('forces a flush and logs the export result', async () => {
    const logger = { info: jest.fn(), warn: jest.fn() };
    const flushCallback = jest.fn().mockResolvedValue({ statusCode: 200 });
    mockOtelDiagApi();

    jest.doMock('config', () => mockConfig(connectionString));
    jest.doMock('applicationinsights', () => appInsightsModuleMock({
      context: { tags: {}, keys: { cloudRole: 'cloudRole' } },
      flush: flushCallback
    }));
    jest.doMock('@hmcts/nodejs-logging', () => ({
      Logger: { getLogger: () => logger }
    }));

    loadAppInsights();

    expect(flushCallback).toHaveBeenCalledTimes(1);
    await flushCallback();
    await Promise.resolve();
    expect(logger.info).toHaveBeenCalledWith('[ai-diag] flush completed: %o', { statusCode: 200 });
  });

  it('logs a warning when flush rejects', async () => {
    const logger = { info: jest.fn(), warn: jest.fn() };
    const flushCallback = jest.fn().mockRejectedValue(new Error('export timeout'));
    mockOtelDiagApi();

    jest.doMock('config', () => mockConfig(connectionString));
    jest.doMock('applicationinsights', () => appInsightsModuleMock({
      context: { tags: {}, keys: { cloudRole: 'cloudRole' } },
      flush: flushCallback
    }));
    jest.doMock('@hmcts/nodejs-logging', () => ({
      Logger: { getLogger: () => logger }
    }));

    loadAppInsights();

    await flushCallback().catch((_err: Error): undefined => undefined);
    await Promise.resolve();
    expect(logger.warn).toHaveBeenCalledWith('[ai-diag] flush failed: %s', 'export timeout');
  });

  it('exposes the raw connection string via environment variable', () => {
    mockOtelDiagApi();

    jest.doMock('config', () => mockConfig('InstrumentationKey=test-key'));
    jest.doMock('applicationinsights', () => appInsightsModuleMock());
    jest.doMock('@hmcts/nodejs-logging', () => ({
      Logger: { getLogger: () => ({ info: jest.fn(), warn: jest.fn() }) }
    }));

    loadAppInsights();

    expect(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING).toBe('InstrumentationKey=test-key');
  });

  it.each([
    ['missing defaultClient', undefined],
    ['no context', {}],
    ['no tags', { context: {} }],
    ['no keys', { context: { tags: {} } }],
    ['no cloudRole', { context: { tags: {}, keys: {} } }],
    ['empty cloudRole', { context: { tags: {}, keys: { cloudRole: '' } } }]
  ])('handles %s without throwing', (_label, appDefaultClient) => {
    const logger = { info: jest.fn(), warn: jest.fn() };
    mockOtelDiagApi();

    jest.doMock('config', () => mockConfig(connectionString));
    jest.doMock('applicationinsights', () => appInsightsModuleMock(appDefaultClient));
    jest.doMock('@hmcts/nodejs-logging', () => ({
      Logger: { getLogger: () => logger }
    }));

    loadAppInsights();

    expect(logger.info).toHaveBeenCalledWith('Application Insights enabled');
  });
});
