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
      .setSendLiveMetrics(true);

    appInsights.start();

    // 3. Re-register diagnostic logger
    const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.VERBOSE);

    // 4. Send startup canary
    if (appInsights.defaultClient && appInsights.defaultClient.trackTrace) {
      appInsights.defaultClient.trackTrace({ message: 'ai-startup-canary' });
    }

    if (appInsights.defaultClient && appInsights.defaultClient.flush) {
      // Force an immediate export so we can confirm the pipeline is actually functioning.
      Promise.resolve(appInsights.defaultClient.flush())
        .then((result: unknown) => {
          logger.info('[ai-diag] flush completed: %o', result);
        })
        .catch((error: Error) => {
          logger.warn('[ai-diag] flush failed: %s', error.message);
        });
    }

    logger.info('Application Insights enabled');

    // Network probe: confirm the pod can reach the AI ingestion endpoint.
    const https = require('https');
    const ingestionHost = connectionString.split(';')
      .map((p: string) => p.split('='))
      .find((p: string[]) => p[0] === 'IngestionEndpoint')?.[1];
    const probeUrl = new URL(ingestionHost || 'https://dc.services.visualstudio.com/');
    https.get({ hostname: probeUrl.hostname, port: 443, path: '/', timeout: 5000 }, (res: any) => {
      logger.info('[ai-diag] Ingestion probe: HTTP %s from %s', res.statusCode, probeUrl.hostname);
      res.resume();
    }).on('error', (err: Error) => {
      logger.info('[ai-diag] Ingestion probe FAILED: %s (%s)', err.message, probeUrl.hostname);
    }).on('timeout', function(this: any) { this.destroy(); });
  } catch (error) {
    logger.warn('Application Insights setup failed; continuing without telemetry', error);
  }
}

module.exports = enableAppInsights;
