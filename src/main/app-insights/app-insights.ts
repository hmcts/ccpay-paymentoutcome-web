const appInsights = require('applicationinsights');
const config = require('config');
const { Logger } = require('@hmcts/nodejs-logging');

const logger = Logger.getLogger('app-insights');

function enableAppInsights(): void {
  const connectionString = config.get('appInsights.connectionString');

  if (!connectionString || connectionString === 'false') {
    return;
  }

  try {
    appInsights
      .setup()
      .setConnectionString(String(connectionString))
      .start();

    logger.info('Application Insights enabled');
  } catch (error) {
    logger.warn('Application Insights setup failed; continuing without telemetry', error);
  }
}

module.exports = enableAppInsights;

