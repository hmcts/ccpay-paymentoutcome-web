import { fail } from 'assert';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

const pa11y = require('pa11y');
import * as supertest from 'supertest';
import { app } from '../../main/app';

let server: Server;
let baseUrl: string;
let agent: supertest.SuperAgentTest;

class Pa11yResult {
  documentTitle: string;
  pageUrl: string;
  issues: PallyIssue[];
}

class PallyIssue {
  code: string;
  context: string;
  message: string;
  selector: string;
  type: string;
  typeCode: number;
}

beforeAll(done => {
  server = app.listen(0, () => {
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    agent = supertest.agent(baseUrl);
    done();
  });
});

afterAll(done => {
  server.close(done);
});

function ensurePageCallWillSucceed(url: string): Promise<void> {
  return agent.get(url).then((res: supertest.Response) => {
    if (res.redirect) {
      throw new Error(
        `Call to ${url} resulted in a redirect to ${res.get('Location')}`,
      );
    }
    if (res.serverError) {
      throw new Error(`Call to ${url} resulted in internal server error`);
    }
  });
}

function runPally(url: string): Promise<Pa11yResult> {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  const chromeLaunchConfig = {
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    ...(executablePath ? { executablePath } : {}),
  };

  return pa11y(url, {
    hideElements: '.govuk-footer__licence-logo, .govuk-header__logotype-crown',
    chromeLaunchConfig,
  });
}

function expectNoErrors(messages: PallyIssue[]): void {
  const errors = messages.filter(m => m.type === 'error');

  if (errors.length > 0) {
    const errorsAsJson = `${JSON.stringify(errors, null, 2)}`;
    fail(`There are accessibility issues: \n${errorsAsJson}\n`);
  }
}

function testAccessibility(url: string): void {
  describe(`Page ${url}`, () => {
    test('should have no accessibility errors', done => {
      console.log(`Checking accessibility for page: ${url}`);
      ensurePageCallWillSucceed(url)
        .then(() => runPally(`${baseUrl}${url}`))
        .then((result: Pa11yResult) => {
          expectNoErrors(result.issues);
          done();
        })
        .catch((err: Error) => done(err));
    }, 15000); // Increase timeout to 15 seconds
  });
}

describe('Accessibility', () => {
  // testing accessibility of the home page
  testAccessibility('/');
});
