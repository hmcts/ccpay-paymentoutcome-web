import wrappedFetch from '../../app/client/request';
const config = require('config');
const otp = require('otp');
const s2sUrl =  config.get('s2s.url');
const payhubUrl =  config.get('payhub.url');
const paymentoutcomeSecret = config.get('secrets.ccpay.paymentoutcome-s2s-web');
const microService = config.get('security.clientId');

export class PayhubService {
  static async getPaymentStatus (uuid: string): Promise<boolean> {
    const token = await this.createAuthToken();
    const response = await wrappedFetch(`${payhubUrl}/card-payments/${uuid}/status`, {
      method: 'GET',
      headers: {
        ServiceAuthorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch payment status: ${response.statusText}`);
    }
    return response.json();
  }

  static async createAuthToken(): Promise<string> {
    const otpPassword = otp({ secret: paymentoutcomeSecret }).totp();
    const serviceAuthRequest = {
      microservice: microService,
      oneTimePassword: otpPassword,
    };
    const response = await wrappedFetch(`${s2sUrl}/lease`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(serviceAuthRequest),
    });

    if (!response.ok) {
      throw new Error(`Failed to get auth token: ${response.statusText}`);
    }
    // s2s auth returns plain text response
    return await response.text();
  }
}
