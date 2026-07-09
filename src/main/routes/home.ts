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

function isPaymentSuccess(status: unknown): boolean {
  return typeof status === 'string' && status.trim().toLowerCase() === 'success';
}

export default function(app: Application): void {

  app.get('/payment/:id/confirmation', (req, res) => {
    const uuid = req.params.id;
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
  });
}
