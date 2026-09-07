const loadPropertiesVolume = (addToMock = jest.fn()) => {
  jest.resetModules();
  jest.doMock('config', () => ({
    __esModule: true,
    default: {},
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
    const { PropertiesVolume, addToMock } = loadPropertiesVolume();

    new PropertiesVolume().enableForEnv('development');

    expect(addToMock).not.toHaveBeenCalled();
  });

  it('loads properties volume for non-dev env', () => {
    const { PropertiesVolume, addToMock } = loadPropertiesVolume();

    new PropertiesVolume().enableForEnv('production');

    expect(addToMock).toHaveBeenCalled();
  });
});
