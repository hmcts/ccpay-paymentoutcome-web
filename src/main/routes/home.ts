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

    // Require end-user auth to prevent unauthenticated access by UUID (IDOR)
    if (!userAuthorization) {
      return res.status(401).render(render, { error: true, result: [], url: exuiUrl });
    }

    // Basic input hardening – only accept UUIDs in the expected format
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidV4Regex.test(uuid)) {
      return res.status(400).render(render, { error: true, result: [], url: exuiUrl });
    }

    PayhubService
      .getPaymentStatus(uuid, userAuthorization)
      .then((r: any) => {
        if (r.status === "Success") {
          res.render(render, { error: false, result: r, url: exuiUrl });
        } else {
          res.render(render, { error: true, result: r, url: exuiUrl });
        }
      }).catch(() => {
        res.render(render, { error: true, result: [], url: exuiUrl });
      });
  });
}
