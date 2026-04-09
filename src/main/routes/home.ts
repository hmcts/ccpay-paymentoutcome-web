import { Application } from 'express';
import { PayhubService } from '../app/payhub/payhubService';
import { PaymentConfirmationTokenService } from '../app/security/paymentConfirmationToken';
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
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const verification = PaymentConfirmationTokenService.verifyToken(token, uuid);

    if (!verification.isValid) {
      res.status(403);
      return res.render('error');
    }

    PayhubService
    .getPaymentStatus(uuid)
    .then((r: any) => {
      if (verification.claims) {
        if (verification.claims.caseNumber) {
          const tokenCaseNumber = verification.claims.caseNumber;
          const responseCaseNumber = String(r.ccd_case_number || '');
          if (!responseCaseNumber || responseCaseNumber !== tokenCaseNumber) {
            res.status(403);
            return res.render('error');
          }
        }

        if (verification.claims.payerReference) {
          const tokenPayerReference = verification.claims.payerReference;
          const responsePayerReference = String(r.reference || '');
          if (!responsePayerReference || responsePayerReference !== tokenPayerReference) {
            res.status(403);
            return res.render('error');
          }
        }
      }

      const language = getLanguage(req.url);
      const render = language === 'cy' ? 'home-welsh' : 'home';
      if(r.status == 'Success') {
      res.render(render, { error: false, result: r, url: exuiUrl});
      }
      else {
       res.render(render, { error: true, result: r, url: exuiUrl });
      }
    }).catch(()=> {
      const language = getLanguage(req.url);
      const render = language === 'cy' ? 'home-welsh' : 'home';
      res.render(render, { error: true, result: [], url: exuiUrl });
    });
  });
}
