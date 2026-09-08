const config = require('config');
const { Logger } = require('@hmcts/nodejs-logging');

const logger = Logger.getLogger('app-insights');
const CLOUD_ROLE_NAME = 'ccpay-paymentoutcome-web';
const EMPTY_CONNECTION_STRING = 'InstrumentationKey=00000000-0000-0000-0000-000000000000';

function isValidConnectionString(connectionString: unknown): connectionString is string {
  return typeof connectionString === 'string' &&
    connectionString.startsWith('InstrumentationKey=') &&
    connectionString !== EMPTY_CONNECTION_STRING;
}

function logConnectionStringDetails(connectionString: string): void {
  const parts = connectionString.split(';').reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.split('=');
    acc[key] = rest.join('=');
    return acc;
  }, {});
  logger.info('[ai-diag] InstrumentationKey=%s...', parts['InstrumentationKey'].slice(0, 8));
  logger.info('[ai-diag] IngestionEndpoint=%s',
    parts['IngestionEndpoint'] || 'none (default https://dc.services.visualstudio.com)');
  logger.info('[ai-diag] LiveEndpoint=%s',
    parts['LiveEndpoint'] || 'none (default https://rt.services.visualstudio.com)');
}

function enableAppInsights(): void {
  try {
    const connectionString = config.get('secrets.ccpay.app-insights-connection-string');

    if (!isValidConnectionString(connectionString)) {
      logger.info('Application Insights connection string not configured; continuing without telemetry');
      return;
    }

    logConnectionStringDetails(connectionString);

    const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.VERBOSE);

    // App Insights 3.x uses OpenTelemetry resource/service.name for cloud role mapping.
    process.env.OTEL_SERVICE_NAME = CLOUD_ROLE_NAME;

    // Lazy-load to avoid loading ESM-only internals in Jest paths that don't initialize App Insights.
    const appInsights = require('applicationinsights');

    appInsights.setup(connectionString)
      .setAutoDependencyCorrelation(true)
      .setAutoCollectConsole(true, true)
      .setSendLiveMetrics(true);

    if (appInsights.defaultClient &&
      appInsights.defaultClient.context &&
      appInsights.defaultClient.context.tags &&
      appInsights.defaultClient.context.keys &&
      appInsights.defaultClient.context.keys.cloudRole) {
      appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = CLOUD_ROLE_NAME;
    }

    appInsights.start();

    if (appInsights.defaultClient && appInsights.defaultClient.trackTrace) {
      appInsights.defaultClient.trackTrace({ message: 'ai-startup-canary' });
    }

    logger.info('Application Insights enabled');
  } catch (error) {
    logger.warn('Application Insights setup failed; continuing without telemetry', error);
  }
}

module.exports = enableAppInsights;
