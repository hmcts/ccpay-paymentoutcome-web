const config = require('config');
const { Logger } = require('@hmcts/nodejs-logging');

const logger = Logger.getLogger('app-insights');

function enableAppInsights(): void {
  try {
    if (config.get('appInsights.connectionString')) {
          // Lazy-load to avoid loading ESM-only internals in Jest paths that don't initialize App Insights.
          const appInsights = require('applicationinsights');
          appInsights.setup(config.get('appInsights.connectionString'))
            .setSendLiveMetrics(true)
            .start();

          appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 'rpe-expressjs-template';
          appInsights.defaultClient.trackTrace({message: 'App insights activated'});
          logger.info('Application Insights enabled');
     }
  } catch (error) {
    logger.warn('Application Insights setup failed; continuing without telemetry', error);
  }
}

module.exports = enableAppInsights;
