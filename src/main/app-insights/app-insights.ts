const config = require('config');
const { Logger } = require('@hmcts/nodejs-logging');

const logger = Logger.getLogger('app-insights');
const CLOUD_ROLE_NAME = 'ccpay-paymentoutcome-web';
const EMPTY_CONNECTION_STRING = 'InstrumentationKey=00000000-0000-0000-0000-000000000000';
const HEALTH_REQUEST_SAMPLE_RATE = 0.01;

function isValidConnectionString(connectionString: unknown): connectionString is string {
  return typeof connectionString === 'string' &&
    connectionString.startsWith('InstrumentationKey=') &&
    connectionString !== EMPTY_CONNECTION_STRING;
}

function isHealthRequest(request: { url?: string }): boolean {
  const path = (request.url || '').split('?')[0];
  return path === '/health' || path.startsWith('/health/');
}

function sampleHealthRequest(request: { url?: string }): boolean {
  return isHealthRequest(request) && Math.random() >= HEALTH_REQUEST_SAMPLE_RATE;
}

function enableAppInsights(): void {
  try {
    const connectionString = config.get('secrets.ccpay.app-insights-connection-string');

    if (!isValidConnectionString(connectionString)) {
      logger.info('Application Insights connection string not configured; continuing without telemetry');
      return;
    }

    // 1. Set environment variables for the OpenTelemetry engine
    process.env.OTEL_SERVICE_NAME = CLOUD_ROLE_NAME;
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = connectionString;

    // Lazy-load to avoid loading ESM-only internals in Jest paths
    const appInsights = require('applicationinsights');

    // 2. Initialize with clean environment bindings
    appInsights.setup()
      .setAutoDependencyCorrelation(true)
      .setAutoCollectConsole(true, true)
      .setSendLiveMetrics(true)
      .setAzureMonitorOptions({
        samplingRatio: 1,
        tracesPerSecond: 0,
        instrumentationOptions: {
          http: {
            enabled: true,
            ignoreIncomingRequestHook: sampleHealthRequest
          }
        }
      });

    appInsights.start();

    logger.info('Application Insights enabled');
  } catch (error) {
    logger.warn('Application Insights setup failed; continuing without telemetry', error);
  }
}

module.exports = enableAppInsights;
