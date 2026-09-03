const config = require('config');
const appInsights = require('applicationinsights');
const { Logger } = require('@hmcts/nodejs-logging');

const logger = Logger.getLogger('app-insights');
const cloudRoleName = 'ccpay-paymentoutcome-web';

function enableAppInsights(): void {
  try {
    if (config.get('appInsights.connectionString')) {
      process.env.OTEL_SERVICE_NAME = cloudRoleName;
      appInsights.setup(config.get('appInsights.connectionString'))
        .setAutoDependencyCorrelation(true)
        .setAutoCollectConsole(true, true)
        .setSendLiveMetrics(true)
        .start();

      appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = cloudRoleName;
      appInsights.defaultClient.trackTrace({message: 'App insights activated'});
      logger.info('Application Insights enabled');
    }
  } catch (error) {
    logger.warn('Application Insights setup failed; continuing without telemetry', error);
  }
}

module.exports = enableAppInsights;
export {};
