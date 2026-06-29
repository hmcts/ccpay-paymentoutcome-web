const config = require('config');
const { Logger } = require('@hmcts/nodejs-logging');

const logger = Logger.getLogger('propertiesUtil');

export function getSessionPaymentOutcomeSecret(): string {
  try {
      if (config.get('secrets.ccpay.paymentoutcome-s2s-web')) {
        return config.get('secrets.ccpay.paymentoutcome-s2s-web');
       }
    } catch (error) {
      logger.error('Application error getting paymentoutcome-s2s-web, ccpay-paymentoutcome-web will not work', error);
    }
}
