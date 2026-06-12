import { Application } from 'express';
import { PayhubService } from '../app/payhub/payhubService';
import { hmacSha256, compareHashes } from '../app/util/hmac';
const config = require('config');
const url = require('url');

const exuiUrl =  config.get('exui.url').replace('.prod', '');

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

export default function(app: Application): void {

  app.get('/payment/:id/confirmation/:rc', (req, res) => {
    const uuid = req.params.id;
    const rc = req.params.rc;
    const language = getLanguage(req.url);
    const render = language === "cy" ? 'home-welsh' : 'home';
    console.log('rendering home page with language: ',language);
    console.log('rendering home page with result: ',render);

    PayhubService
    .getPaymentStatus(uuid)
    .then((r: any) => {
      const language = getLanguage(req.url);
      const render = language === "cy" ? 'home-welsh' : 'home';
      if (isPaymentSuccess(r?.status)) {
      res.render(render, { error: false, result: r, url: exuiUrl});
      }
      else {
       res.render(render, { error: true, result: r, url: exuiUrl });
      }
    }).catch(()=> {
      const language = getLanguage(req.url);
      const render = language === "cy" ? 'home-welsh' : 'home';
      res.render(render, { error: true, result: [], url: exuiUrl });
    });
      .getPaymentStatus(uuid)
        .then((r: any) => {
          if(r.status == "Success") {
            const reference = r.reference;
            console.log( 'My reference is: ', reference);
            const hashReference = hmacSha256('toto1234!',reference);
            console.log( 'My hash reference from response: ', hashReference);
            console.log( 'My hash reference from url: ',rc);
            // Compare the hash of the reference with the provided rc value passed as parameter by the consumer.
            //If they match, render the home page with the result, otherwise render the home page with an error message.
            if (compareHashes(hashReference,rc)){
              res.render(render, { error: false, result: r, url: exuiUrl});
            } else {
              console.log('401!!!!!!!');
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
