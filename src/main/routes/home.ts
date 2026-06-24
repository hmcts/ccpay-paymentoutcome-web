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

function getSessionSecret(): string {
  try {
      if (config.get('session.secret')) {
        return config.get('session.secret');
       }
    } catch (error) {
      logger.error('Application error getting session.secret !!!!', error);
    }
}

export default function(app: Application): void {

  app.get('/payment/:id/confirmation/:rc', (req, res) => {
    const uuid = req.params.id;
    const rc = req.params.rc;
    const language = getLanguage(req.url);
    const render = language === "cy" ? 'home-welsh' : 'home';
    console.log('rendering home page with language: ',language);
    console.log('rendering home page with result: ',render);
    const carPaymentSecret = getSessionSecret();
    PayhubService
      .getPaymentStatus(uuid)
        .then((r: any) => {
          console.log('current time:', new Date().toISOString());
          console.log( 'My status is: ', r.status);
          console.log( 'My uuid reference: ', uuid);
          if (isPaymentSuccess(r?.status)) {
            const reference = r.reference;
            console.log( 'My reference is RC from status: ', reference);
            console.log('My paybubbleSessionSecret is: ',carPaymentSecret);
            const hashReference = hmacSha256(carPaymentSecret,reference);
            console.log( 'The hash RC reference from response: ', hashReference);
            console.log( 'My hash RC reference from url: ',rc);
            // Compare the hash of the reference with the provided rc value passed as parameter by the consumer.
            //If they match, render the home page with the result, otherwise render the home page with an error message.
            if (compareHashes(hashReference,rc)){
              console.log( '--------All good ---------');
              res.render(render, { error: false, result: r, url: exuiUrl});
            } else {
              console.log( '--------MUY MAL  good ---------');
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
