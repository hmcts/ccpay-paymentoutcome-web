import config from 'config';
import * as propertiesVolume from '@hmcts/properties-volume';
import { get, set } from 'lodash';

const appInsightsConnectionStringPath = 'secrets.ccpay.app-insights-connection-string';
const appInsightsConnectionStringConfigPath = 'appInsights.connectionString';

export class PropertiesVolume {

  enableForEnv(env: string): void {
    if (env !== 'development') {
      propertiesVolume.addTo(config);

      const appInsightsConnectionString = get(config as any, appInsightsConnectionStringPath);
      if (typeof appInsightsConnectionString === 'string' && appInsightsConnectionString.trim() !== '') {
        set(config, appInsightsConnectionStringConfigPath, appInsightsConnectionString);
      }
    }
  }

}
