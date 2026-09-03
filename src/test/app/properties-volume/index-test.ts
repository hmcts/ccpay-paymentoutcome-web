type ConfigMock = {
  appInsights: {
    connectionString: boolean | string;
  };
  secrets?: {
    ccpay?: {
      'app-insights-connection-string'?: string;
    };
  };
};

const connectionString = 'InstrumentationKey=test-key;IngestionEndpoint=https://test/';

const createConfig = (secret?: string): ConfigMock => ({
  appInsights: {
    connectionString: false,
  },
  secrets: secret
    ? {
      ccpay: {
        'app-insights-connection-string': secret,
      },
    }
    : undefined,
});

const loadPropertiesVolume = (configMock: ConfigMock, addToMock = jest.fn()) => {
  jest.resetModules();
  jest.doMock('config', () => ({
    __esModule: true,
    default: configMock,
  }));
  jest.doMock('@hmcts/properties-volume', () => ({
    addTo: addToMock,
  }));

  const { PropertiesVolume } = require('../../../main/modules/properties-volume');
  return { PropertiesVolume, addToMock };
};

describe('PropertiesVolume', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('does not load properties volume in dev env', () => {
    const configMock = createConfig();
    const { PropertiesVolume, addToMock } = loadPropertiesVolume(configMock);

    new PropertiesVolume().enableForEnv('development');

    expect(addToMock).not.toHaveBeenCalled();
    expect(configMock.appInsights.connectionString).toBe(false);
  });

  it('loads properties volume and maps App Insights connection string for non-dev env', () => {
    const configMock = createConfig(connectionString);
    const { PropertiesVolume, addToMock } = loadPropertiesVolume(configMock);

    new PropertiesVolume().enableForEnv('production');

    expect(addToMock).toHaveBeenCalledWith(configMock);
    expect(configMock.appInsights.connectionString).toBe(connectionString);
  });
});
