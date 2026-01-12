import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';

chai.use(sinonChai);

describe('AppInsights', () => {
  let mockAppInsights: any;

  beforeEach(() => {
    mockAppInsights = {
      setup: sinon.stub().returnsThis(),
      setAutoDependencyCorrelation: sinon.stub().returnsThis(),
      setAutoCollectConsole: sinon.stub().returnsThis(),
      setSendLiveMetrics: sinon.stub().returnsThis(),
      start: sinon.stub(),
      defaultClient: {
        context: {
          tags: {},
          keys: { cloudRole: 'cloudRole' }
        },
        config: {
          samplingPercentage: 100
        },
        trackTrace: sinon.stub()
      }
    };

    jest.resetModules();
    jest.mock('applicationinsights', () => mockAppInsights);
  });

  afterEach(() => {
    sinon.restore();
    jest.resetModules();
  });

  describe('enable()', () => {
    it('should setup appInsights when instrumentationKey is configured', () => {
      const mockConfig = {
        get: sinon.stub().returns('test-instrumentation-key')
      };
      jest.mock('config', () => mockConfig);

      const { AppInsights } = require('../../../../main/modules/appinsights');
      const appInsightsInstance = new AppInsights();

      appInsightsInstance.enable();

      expect(mockAppInsights.setup).to.have.been.calledWith('test-instrumentation-key');
      expect(mockAppInsights.setAutoDependencyCorrelation).to.have.been.calledWith(true);
      expect(mockAppInsights.setAutoCollectConsole).to.have.been.calledWith(true, true);
      expect(mockAppInsights.setSendLiveMetrics).to.have.been.calledWith(true);
      expect(mockAppInsights.start).to.have.been.called;
      expect(mockAppInsights.defaultClient.trackTrace).to.have.been.calledWith({ message: 'App insights activated' });
    });

    it('should set cloud role name', () => {
      const mockConfig = {
        get: sinon.stub().returns('test-instrumentation-key')
      };
      jest.mock('config', () => mockConfig);

      const { AppInsights } = require('../../../../main/modules/appinsights');
      const appInsightsInstance = new AppInsights();

      appInsightsInstance.enable();

      expect(mockAppInsights.defaultClient.context.tags['cloudRole']).to.equal('rpe-expressjs-template');
    });

    it('should set sampling percentage to 1', () => {
      const mockConfig = {
        get: sinon.stub().returns('test-instrumentation-key')
      };
      jest.mock('config', () => mockConfig);

      const { AppInsights } = require('../../../../main/modules/appinsights');
      const appInsightsInstance = new AppInsights();

      appInsightsInstance.enable();

      expect(mockAppInsights.defaultClient.config.samplingPercentage).to.equal(1);
    });

    it('should not setup appInsights when instrumentationKey is not configured', () => {
      const mockConfig = {
        get: sinon.stub().returns(null)
      };
      jest.mock('config', () => mockConfig);

      const { AppInsights } = require('../../../../main/modules/appinsights');
      const appInsightsInstance = new AppInsights();

      appInsightsInstance.enable();

      expect(mockAppInsights.setup).to.not.have.been.called;
      expect(mockAppInsights.start).to.not.have.been.called;
    });

    it('should not setup appInsights when instrumentationKey is empty string', () => {
      const mockConfig = {
        get: sinon.stub().returns('')
      };
      jest.mock('config', () => mockConfig);

      const { AppInsights } = require('../../../../main/modules/appinsights');
      const appInsightsInstance = new AppInsights();

      appInsightsInstance.enable();

      expect(mockAppInsights.setup).to.not.have.been.called;
      expect(mockAppInsights.start).to.not.have.been.called;
    });
  });
});
