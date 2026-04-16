type AppInsightsMock = {
  setup: jest.Mock,
  setSendLiveMetrics: jest.Mock,
  start: jest.Mock,
  trackTrace: jest.Mock,
  tags: Record<string, string>
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

describe('AppInsights module', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('starts app insights and sets cloud role when instrumentation key exists', () => {
    const mocks = createMocks();

    jest.isolateModules(() => {
      jest.doMock('config', () => ({
        __esModule: true,
        default: {
          get: jest.fn().mockReturnValue('instrumentation-key')
        }
      }));

      jest.doMock('applicationinsights', () => ({
        setup: mocks.setup,
        defaultClient: {
          context: {
            tags: mocks.tags,
            keys: {
              cloudRole: 'cloudRole'
            }
          },
          trackTrace: mocks.trackTrace
        }
      }));

      const { AppInsights } = require('../../../../main/modules/appinsights');
      new AppInsights().enable();
    });

    expect(mocks.setup).toHaveBeenCalledWith('instrumentation-key');
    expect(mocks.setSendLiveMetrics).toHaveBeenCalledWith(true);
    expect(mocks.start).toHaveBeenCalled();
    expect(mocks.tags.cloudRole).toBe('rpe-expressjs-template');
    expect(mocks.trackTrace).toHaveBeenCalledWith({ message: 'App insights activated' });
  });

  test('does nothing when instrumentation key is not configured', () => {
    const mocks = createMocks();

    jest.isolateModules(() => {
      jest.doMock('config', () => ({
        __esModule: true,
        default: {
          get: jest.fn().mockReturnValue(false)
        }
      }));

      jest.doMock('applicationinsights', () => ({
        setup: mocks.setup,
        defaultClient: {
          context: {
            tags: mocks.tags,
            keys: {
              cloudRole: 'cloudRole'
            }
          },
          trackTrace: mocks.trackTrace
        }
      }));

      const { AppInsights } = require('../../../../main/modules/appinsights');
      new AppInsights().enable();
    });

    expect(mocks.setup).not.toHaveBeenCalled();
    expect(mocks.setSendLiveMetrics).not.toHaveBeenCalled();
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.trackTrace).not.toHaveBeenCalled();
    expect(mocks.tags.cloudRole).toBeUndefined();
  });
});

