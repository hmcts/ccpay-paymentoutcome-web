const config = require('config');
const appInsights = require('applicationinsights');

const enableAppInsights = () => {
  if (!config.get('appInsights.instrumentationKey')) {
    return;
  }
  const appInsightsKey = config.get('appInsights.instrumentationKey');
  const appInsightsRoleName = 'ccpay-paymentoutcome-web';
  appInsights.setup(appInsightsKey)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectConsole(true, true);
  appInsights.defaultClient.context.tags[
    appInsights.defaultClient.context.keys.cloudRole] = appInsightsRoleName;
  appInsights.defaultClient.config.samplingPercentage = 1;
  appInsights.start();
};

module.exports = enableAppInsights;
