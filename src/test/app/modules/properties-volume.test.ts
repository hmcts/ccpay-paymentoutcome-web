describe('PropertiesVolume', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('maps app insights and paybubble secrets from nested ccpay keys', () => {
    const configObject = {};
    const addTo = jest.fn();
    const set = jest.fn();
    const values: Record<string, unknown> = {
      'secrets.app-insights-connection-string': '   ',
      'secrets.ccpay.app-insights-connection-string': 'InstrumentationKey=abc',
      'secrets.paybubble-session-secret': '',
      'secrets.ccpay.paybubble-session-secret': 'paybubble-secret-value'
    };

    const get = jest.fn((_: unknown, path: string[]) => values[path.join('.')]);

    jest.doMock('config', () => ({ __esModule: true, default: configObject }));
    jest.doMock('@hmcts/properties-volume', () => ({ addTo }));
    jest.doMock('lodash', () => ({ get, set }));

    jest.isolateModules(() => {
      const { PropertiesVolume } = require('../../../main/modules/properties-volume');
      new PropertiesVolume().enableFor({ locals: { ENV: 'aat' } });
    });

    expect(addTo).toHaveBeenCalledWith(configObject);
    expect(set).toHaveBeenCalledWith(configObject, 'appInsights.connectionString', 'InstrumentationKey=abc');
    expect(set).toHaveBeenCalledWith(configObject, 'session.secret', 'paybubble-secret-value');
  });

  it('falls back to top-level secret names when nested paths are not present', () => {
    const configObject = {};
    const addTo = jest.fn();
    const set = jest.fn();
    const values: Record<string, unknown> = {
      'app-insights-connection-string': 'InstrumentationKey=top-level',
      'paybubble-session-secret': 'top-level-session-secret'
    };

    const get = jest.fn((_: unknown, path: string[]) => values[path.join('.')]);

    jest.doMock('config', () => ({ __esModule: true, default: configObject }));
    jest.doMock('@hmcts/properties-volume', () => ({ addTo }));
    jest.doMock('lodash', () => ({ get, set }));

    jest.isolateModules(() => {
      const { PropertiesVolume } = require('../../../main/modules/properties-volume');
      new PropertiesVolume().enableFor({ locals: { ENV: 'prod' } });
    });

    expect(addTo).toHaveBeenCalledWith(configObject);
    expect(set).toHaveBeenCalledWith(configObject, 'appInsights.connectionString', 'InstrumentationKey=top-level');
    expect(set).toHaveBeenCalledWith(configObject, 'session.secret', 'top-level-session-secret');
  });

  it('does not load or map secrets in development', () => {
    const configObject = {};
    const addTo = jest.fn();
    const set = jest.fn();
    const get = jest.fn();

    jest.doMock('config', () => ({ __esModule: true, default: configObject }));
    jest.doMock('@hmcts/properties-volume', () => ({ addTo }));
    jest.doMock('lodash', () => ({ get, set }));

    jest.isolateModules(() => {
      const { PropertiesVolume } = require('../../../main/modules/properties-volume');
      new PropertiesVolume().enableFor({ locals: { ENV: 'development' } });
    });

    expect(addTo).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });
});

