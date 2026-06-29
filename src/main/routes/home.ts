import { Application } from 'express';
import { PayhubService } from '../app/payhub/payhubService';
import { hmacSha256, compareHashes } from '../app/util/hmac';
const { Logger } = require('@hmcts/nodejs-logging');
const config = require('config');
const url = require('url');
const exuiUrl =  config.get('exui.url').replace('.prod', '');

const logger = Logger.getLogger('app');

function getLanguage(urlString: any) {
  const parsedUrl = url.parse(urlString, true);
  const query = parsedUrl.query
  if (query.language === "cy") {
    return "cy";
  } else {
    return "en";
  }
}

function isPaymentSuccess(status: unknown): boolean {
  return typeof status === 'string' && status.trim().toLowerCase() === 'success';
}

function getSessionPaymentOutcomeSecret(): string {
  try {
      if (config.get('secrets.ccpay.paymentoutcome-s2s-web')) {
        return config.get('secrets.ccpay.paymentoutcome-s2s-web');
       }
    } catch (error) {
      logger.error('Application error getting paymentoutcome-s2s-web.', error);
    }
}
export default function(app: Application): void {

  app.get('/payment/:id/confirmation/:rc', (req, res) => {
    const uuid = req.params.id;
    const rc = req.params.rc;
    const language = getLanguage(req.url);
    const render = language === "cy" ? 'home-welsh' : 'home';
    const carPaymentSecret = getSessionPaymentOutcomeSecret();
    PayhubService
      .getPaymentStatus(uuid)
        .then((r: any) => {
          if (isPaymentSuccess(r?.status)) {
            const reference = r.reference;
            const hashReference = hmacSha256(carPaymentSecret,reference);
            // Compare the hash of the reference with the provided rc value passed as parameter by the consumer.
            //If they match, render the home page with the result, otherwise render the home page with an error message.
            if (compareHashes(hashReference,rc)){
              res.render(render, { error: false, result: r, url: exuiUrl});
            } else {
              return res.status(401).render(render, { error: true, result: [], url: exuiUrl });
            }
          } else {
            res.render(render, { error: true, result: r, url: exuiUrl });
          }
        }).catch(()=> {
            res.render(render, { error: true, result: [], url: exuiUrl });
        });
  });
}
