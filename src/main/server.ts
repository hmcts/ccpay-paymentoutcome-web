#!/usr/bin/env node
const env = process.env.NODE_ENV || 'development';
const { PropertiesVolume } = require('./modules/properties-volume');
new PropertiesVolume().enableForEnv(env);

// Enable app insights before Express is loaded in app.ts
const enableAppInsights = require('./app-insights/app-insights');
enableAppInsights();

const { Logger } = require('@hmcts/nodejs-logging');
const { app } = require('./app');
const logger = Logger.getLogger('server');

// TODO: set the right port for your application
const port: number = parseInt(process.env.PORT, 10) || 3100;


app.listen(port, () => {
  logger.info(`Application started: http://localhost:${port}`);
});

export {};
