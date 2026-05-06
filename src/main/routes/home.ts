import { Application } from 'express';
import { PayhubService } from '../app/payhub/payhubService';
const config = require('config');
const url = require('url');
const exuiUrl =  config.get('exui.url').replace('.prod', '');
const sessionCookieName = config.get('session.cookieName');

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BEARER_TOKEN_REGEX = /^Bearer\s+\S+$/i;

type QueryType = Record<string, string | string[] | undefined>;

function getQuery(urlString: string): QueryType {
  return url.parse(urlString, true).query as QueryType;
}

function getLanguage(urlString: string): string {
  const query = getQuery(urlString);
  if (query.language === 'cy') {
    return 'cy';
  } else {
    return 'en';
  }
}

function getRenderTemplate(urlString: string): string {
  return getLanguage(urlString) === 'cy' ? 'home-welsh' : 'home';
}

function hasSessionCookie(cookies: Record<string, string> | undefined): boolean {
  return Boolean(cookies && cookies[sessionCookieName]);
}

function isValidPaymentId(paymentId: string): boolean {
  return UUID_V4_REGEX.test(paymentId);
}

function getValidUserAuthorization(authorizationHeader: string | undefined): string | undefined {
  if (authorizationHeader && BEARER_TOKEN_REGEX.test(authorizationHeader)) {
    return authorizationHeader;
  }

  return undefined;
}

export default function(app: Application): void {

  app.get('/payment/:id/confirmation', (req, res) => {
    const uuid = req.params.id;

    if (!hasSessionCookie(req.cookies)) {
      return res.status(401).send('Unauthorized');
    }

    if (!isValidPaymentId(uuid)) {
      return res.status(400).send('Invalid payment reference');
    }

    const userAuthorization = getValidUserAuthorization(req.get('Authorization'));
    if (!userAuthorization) {
      return res.status(401).send('Unauthorized');
    }

    PayhubService
    .getPaymentStatus(uuid, userAuthorization)
    .then((r: any) => {
      const render = getRenderTemplate(req.url);
      if(r.status == "Success") {
        res.render(render, { error: false, result: r, url: exuiUrl});
      }
      else {
        res.render(render, { error: true, result: r, url: exuiUrl });
      }
    }).catch(() => {
      const render = getRenderTemplate(req.url);
      res.render(render, { error: true, result: [], url: exuiUrl });
    });
  });
}
