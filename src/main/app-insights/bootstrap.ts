import { PropertiesVolume } from '../modules/properties-volume';

const { Logger } = require('@hmcts/nodejs-logging');

const logger = Logger.getLogger('app-insights');

const env = process.env.NODE_ENV || 'development';

// applicationinsights v3 is built on Azure Monitor OpenTelemetry and only
// auto-instruments HTTP requests if the SDK is loaded and started before
// Express. This module must therefore be imported before the express app
// (see server.ts), so it loads the volume secrets and enables App Insights
// as early as possible.
function enableAppInsights(): void {
  try {
    new PropertiesVolume().setupSecrets(env);
    const enable = require('./app-insights');
    enable();
  } catch (error) {
    logger.warn('Application Insights setup failed; continuing without telemetry', error);
  }
}

enableAppInsights();