import config from 'config';
import * as propertiesVolume from '@hmcts/properties-volume';

export class PropertiesVolume {

  enableForEnv(env: string): void {
    if (env !== 'development') {
      propertiesVolume.addTo(config);
    }
  }

}
