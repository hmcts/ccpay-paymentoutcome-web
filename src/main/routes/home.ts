import { Application } from 'express';
import { PayhubService } from '../app/payhub/payhubService';
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

export default function(app: Application): void {

  app.get('/payment/:id/confirmation', (req, res) => {
    const uuid = req.params.id;
    const userAuthorization = req.get('Authorization');

    const language = getLanguage(req.url);
    const render = language === "cy" ? 'home-welsh' : 'home';
    const IDAM = 'https://idam-api.demo.platform.hmcts.net/details';




    // Require end-user auth to prevent unauthenticated access by UUID (IDOR)
    if (!userAuthorization) {
      console.error('-------userAuthorization empty-------');
      return res.status(401).render(render, { error: true, result: [], url: exuiUrl });
    }

    const validateIdam = (auth: string): Promise<boolean> => {
      return new Promise((resolve) => {
        try {
          const https = require('https');
          const idamUrl = new URL(IDAM);
          const options = {
            hostname: idamUrl.hostname,
            path: (idamUrl.pathname || '/') + (idamUrl.search || ''),
            method: 'GET',
            headers: {
              accept: 'application/json',
              Authorization: auth
            }
          };

          const idamReq = https.request(options, (idamRes: any) => {
            if (idamRes.statusCode === 200) {
              console.error('-------idamRes.statusCode === 200-------');
              resolve(true);
            } else {
              console.error(`IDAM validation failed with status ${idamRes.statusCode}`);
              resolve(false);
            }
          });

          idamReq.on('error', (err: any) => {
            console.error('IDAM request error', err);
            resolve(false);
          });

          idamReq.end();
        } catch (err) {
          console.error('IDAM validation exception', err);
          resolve(false);
        }
      });
    };

    return validateIdam(userAuthorization)
      .then((isValid) => {
        if (!isValid) {
          console.error('Unauthorized: IDAM validation did not return 200');
          return res.status(401).render(render, { error: true, result: [], url: exuiUrl });
        }

        PayhubService
          .getPaymentStatus(uuid, userAuthorization)
          .then((r: any) => {
            if (r.status === "Success") {
              res.render(render, { error: false, result: r, url: exuiUrl });
            } else {
              res.render(render, { error: true, result: r, url: exuiUrl });
            }
          }).catch((err: any) => {
            console.error('PayhubService error', err);
            res.render(render, { error: true, result: [], url: exuiUrl });
          });
      })
      .catch((err) => {
        console.error('IDAM validation unexpected error', err);
        return res.status(401).render(render, { error: true, result: [], url: exuiUrl });
      });
  });
}
