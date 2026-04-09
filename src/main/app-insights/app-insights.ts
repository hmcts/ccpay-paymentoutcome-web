const appInsights = require('applicationinsights');
const config = require('config');
const { Logger } = require('@hmcts/nodejs-logging');

const logger = Logger.getLogger('app-insights');

function enableAppInsights(): void {
  const instrumentationKey = config.get('appInsights.instrumentationKey');

  if (!instrumentationKey || instrumentationKey === 'false') {
    return;
  }

  try {
    appInsights
      .setup(String(instrumentationKey))
      .start();

    logger.info('Application Insights enabled');
  } catch (error) {
    logger.warn('Application Insights setup failed; continuing without telemetry', error);
  }
}

module.exports = enableAppInsights;

