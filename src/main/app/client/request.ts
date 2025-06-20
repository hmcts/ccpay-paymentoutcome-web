import { RequestLoggingHandler } from '../logging/requestPromiseLoggingHandler'
import { ApiLogger } from '../logging/apiLogger'
const fetch = require('node-fetch')

const logger = new ApiLogger()

const localDevEnvironment = 'development'
const developmentMode = (process.env.NODE_ENV || localDevEnvironment) === localDevEnvironment

const timeout: number = developmentMode ? 10000 : 4500


const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const signal = controller.signal;
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {...options, signal});
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeout}ms`);
    }
    throw error;
  }
  finally {
    clearTimeout(id);
  }

};

// Proxy to wrap fetch with logging
const wrappedFetch = new Proxy(fetchWithTimeout, new RequestLoggingHandler(logger));

export default wrappedFetch;
