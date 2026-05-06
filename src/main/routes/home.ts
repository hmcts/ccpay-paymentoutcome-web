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

    // Null-safe cookie reader and logger
    const parseCookies = (cookieHeader: string | undefined) => {
      if (!cookieHeader) return {};
      return cookieHeader
        .split(';')
        .map(c => c.trim())
        .filter(Boolean)
        .reduce((acc: Record<string, string>, pair) => {
          const [key, ...val] = pair.split('=');
          acc[decodeURIComponent(key || '')] = decodeURIComponent((val.join('=') || '') as string);
          return acc;
        }, {});
    };

    const cookies = (req && (req as any).cookies && Object.keys((req as any).cookies).length)
      ? (req as any).cookies
      : parseCookies(req && req.headers ? (req.headers.cookie as string | undefined) : undefined);

    console.log('All cookies:', cookies);

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
