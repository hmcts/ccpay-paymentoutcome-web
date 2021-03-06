// @ts-ignore
import { Logger } from '@hmcts/nodejs-logging'

export class ApiLogger {
  constructor (public logger = Logger.getLogger('apiLogger.js')) {
    this.logger = logger
  }

  logRequest (requestData: any) {
    return this.logger.debug(this._buildRequestEntry(requestData))
  }

  _buildRequestEntry (requestData: any) {
    return {
      message: `API: ${requestData.method} ${requestData.uri} ` +
      ((requestData.query) ? `| Query: ${this._stringifyObject(requestData.query)} ` : '') +
      ((requestData.requestBody) ? `| Body: ${this._stringifyObject(requestData.requestBody)} ` : '')
    }
  }

  logResponse (responseData: any) {
    this._logLevelFor(responseData.responseCode).call(this.logger, this._buildResponseEntry(responseData))
  }

  _buildResponseEntry (responseData: any) {
    return {
      message: `API: Response ${responseData.responseCode} from ${responseData.uri} ` +
      ((responseData.responseBody) ? `| Body: ${this._stringifyObject(responseData.responseBody)} ` : '') +
      ((responseData.error) ? `| Error: ${this._stringifyObject(responseData.error)} ` : ''),
      responseCode: responseData.responseCode
    }
  }

  _stringifyObject (object: any) {
    if (object !== null && typeof object === 'object') {
      return JSON.stringify(object)
    }

    return object
  }

  _logLevelFor (statusCode: any) {
    if (statusCode < 400) {
      return this.logger.debug
    } else if (statusCode >= 400 && statusCode < 500) {
      return this.logger.warn
    } else {
      return this.logger.error
    }
  }
}
