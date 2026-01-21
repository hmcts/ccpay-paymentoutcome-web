import config from 'config';

const appInsights = require('applicationinsights');

function fineGrainedSampling(envelope: any): boolean {
  if (
    ['RequestData', 'RemoteDependencyData'].includes(envelope.data.baseType) &&
    envelope.data.baseData.name.includes('/health')
  ) {
    envelope.sampleRate = 1;
  }

  return true;
}

export class AppInsights {

  enable(): void {
    if (config.get('appInsights.instrumentationKey')) {
      appInsights.setup(config.get('appInsights.instrumentationKey'))
        .setAutoDependencyCorrelation(true)
        .setAutoCollectConsole(true, true)
        .setSendLiveMetrics(true);

      appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 'rpe-expressjs-template';
      appInsights.defaultClient.addTelemetryProcessor(fineGrainedSampling);
      appInsights.start();
      appInsights.defaultClient.trackTrace({message: 'App insights activated'});
    }
  }

}
