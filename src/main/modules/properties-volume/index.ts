import config from 'config';
import * as propertiesVolume from '@hmcts/properties-volume';
import { Application } from 'express';
import { get, set } from 'lodash';

export class PropertiesVolume {

  enableFor(server: Application): void {
    this.setupSecrets(server.locals.ENV);
  }

  setupSecrets(environment: string): void {
    if (environment !== 'development') {
      propertiesVolume.addTo(config);

      this.setFirstAvailableSecret(
        [
          ['secrets', 'app-insights-connection-string'],
          ['secrets', 'ccpay', 'app-insights-connection-string'],
          ['app-insights-connection-string']
        ],
        'appInsights.connectionString',
      );
    }
  }

  private setFirstAvailableSecret(fromPaths: string[][], toPath: string): void {
    for (const fromPath of fromPaths) {
      const value = get(config, fromPath);
      if (typeof value === 'string' && value.trim() !== '') {
        set(config, toPath, value);
        return;
      }
    }
  }

}
