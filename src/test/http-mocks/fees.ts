import config from 'config';
import mock from 'nock';
import * as HttpStatus from 'http-status-codes';

const serviceBaseURL: string = config.get<string>('payhub.url')
const s2sUrl: string = config.get<string>('s2s.url')

function validFeeWithStatus (status: string) {
  return {
    status: status,
    reference: 'RC-1234-1234-1343-1234',
    ccd_case_number: '1234123412341234'
  }
}

export function resolveCreateToken () {
  mock(`${s2sUrl}`)
    .persist()
    .post(/.*/)
    .reply(HttpStatus.OK, 'token');
}

export function resolveGetPaymentStatus (id: any) {
  mock(`${serviceBaseURL}`)
    .persist()
    .get(/.*/)
    .reply(HttpStatus.OK, validFeeWithStatus(id))
}

export function resolveGetPaymentStatusWithStatus (status: string) {
  mock(`${serviceBaseURL}`)
    .persist()
    .get(/.*/)
    .reply(HttpStatus.OK, validFeeWithStatus(status))
}

export function rejectGetPaymentStatus () {
  mock(`${serviceBaseURL}`)
    .persist()
    .get(/.*/)
    .reply(HttpStatus.INTERNAL_SERVER_ERROR, { message: 'upstream failure' });
}

export function resolvePaymentStatus (id: any) {
  mock(`${serviceBaseURL}`)
    .persist()
    .get(/.*/)
    .reply(HttpStatus.OK)
}
