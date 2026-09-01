type BootstrapAppInsightsMock = {
  setup: jest.Mock;
  setSendLiveMetrics: jest.Mock;
  start: jest.Mock;
  trackTrace: jest.Mock;
  tags: Record<string, string>;
};

const createBootstrapMocks = (): BootstrapAppInsightsMock => {
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

  it('enables application insights on module load when a connection string is configured', () => {
    const mocks = createBootstrapMocks();

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
      require('../../../main/app-insights/bootstrap');
    });

    expect(mocks.setup).toHaveBeenCalledWith('InstrumentationKey=test-key;IngestionEndpoint=https://test/');
    expect(mocks.setSendLiveMetrics).toHaveBeenCalledWith(true);
    expect(mocks.start).toHaveBeenCalled();
    expect(mocks.tags.cloudRole).toBe('ccpay-paymentoutcome-web');
    expect(mocks.trackTrace).toHaveBeenCalledWith({ message: 'App insights activated' });
  });

  it('does nothing when connection string is missing', () => {
    const mocks = createBootstrapMocks();

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
      require('../../../main/app-insights/bootstrap');
    });

    expect(mocks.setup).not.toHaveBeenCalled();
    expect(mocks.start).not.toHaveBeenCalled();
  });
});