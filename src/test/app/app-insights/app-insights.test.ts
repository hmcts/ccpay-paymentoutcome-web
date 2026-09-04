type AppInsightsMock = {
  setup: jest.Mock;
  setAutoDependencyCorrelation: jest.Mock;
  setAutoCollectConsole: jest.Mock;
  setSendLiveMetrics: jest.Mock;
  start: jest.Mock;
  addTelemetryProcessor: jest.Mock;
  tags: Record<string, string>;
};

const connectionString = 'InstrumentationKey=test-key;IngestionEndpoint=https://test/';

const createMocks = (): AppInsightsMock => {
  const start = jest.fn();
  const setSendLiveMetrics = jest.fn().mockReturnValue({ start });
  const setAutoCollectConsole = jest.fn().mockReturnValue({ setSendLiveMetrics });
  const setAutoDependencyCorrelation = jest.fn().mockReturnValue({ setAutoCollectConsole });
  const setup = jest.fn().mockReturnValue({ setAutoDependencyCorrelation });
  const addTelemetryProcessor = jest.fn();
  const tags: Record<string, string> = {};

  return {
    setup,
    setAutoDependencyCorrelation,
    setAutoCollectConsole,
    setSendLiveMetrics,
    start,
    addTelemetryProcessor,
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
        },
        addTelemetryProcessor: mocks.addTelemetryProcessor
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

    jest.doMock('config', () => mockConfig(connectionString));
    jest.doMock('applicationinsights', () => ({
      setup: mocks.setup,
      start: mocks.start,
      defaultClient: {
        context: {
          tags: mocks.tags,
          keys: { cloudRole: 'cloudRole' }
        },
        addTelemetryProcessor: mocks.addTelemetryProcessor
      }
    }));
    jest.doMock('@hmcts/nodejs-logging', () => ({
      Logger: {
        getLogger: () => ({ info: jest.fn(), warn: jest.fn() })
      }
    }));

    loadAppInsights();

    expect(mocks.setup).toHaveBeenCalledWith(connectionString);
    expect(mocks.setAutoDependencyCorrelation).toHaveBeenCalledWith(true);
    expect(mocks.setAutoCollectConsole).toHaveBeenCalledWith(true, true);
    expect(mocks.setSendLiveMetrics).toHaveBeenCalledWith(true);
    expect(mocks.start).toHaveBeenCalled();
    expect(mocks.tags.cloudRole).toBe('ccpay-paymentoutcome-web');
    expect(mocks.addTelemetryProcessor).toHaveBeenCalled();
    expect(process.env.OTEL_SERVICE_NAME).toBe('ccpay-paymentoutcome-web');
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
