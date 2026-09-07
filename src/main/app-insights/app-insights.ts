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

function fineGrainedSampling(envelope: any): boolean {
  const baseType = envelope && envelope.data && envelope.data.baseType;
  const name = envelope && envelope.data && envelope.data.baseData && envelope.data.baseData.name;

  if (
    ['RequestData', 'RemoteDependencyData'].includes(baseType) &&
    typeof name === 'string' &&
    name.includes('/health')
  ) {
    envelope.sampleRate = 1;
  }

  return true;
}

function enableAppInsights(): void {
  try {
    const connectionString = config.get('secrets.ccpay.app-insights-connection-string');

    if (!isValidConnectionString(connectionString)) {
      logger.info('Application Insights connection string not configured; continuing without telemetry');
      return;
    }

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

    if (appInsights.defaultClient && appInsights.defaultClient.addTelemetryProcessor) {
      appInsights.defaultClient.addTelemetryProcessor(fineGrainedSampling);
    }

    appInsights.start();

    logger.info('Application Insights enabled');
  } catch (error) {
    logger.warn('Application Insights setup failed; continuing without telemetry', error);
  }
}

module.exports = enableAppInsights;
