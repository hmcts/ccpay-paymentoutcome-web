import wrappedFetch from '../../app/client/request';
const config = require('config');
const otp = require('otp');
const s2sUrl =  config.get('s2s.url');
const payhubUrl =  config.get('payhub.url');
const paymentoutcomeSecret = config.get('secrets.ccpay.paymentoutcome-s2s-web');
const microService = config.get('security.clientId');

export interface PaymentStatus {
  status: string;
  reference?: string;
  ccd_case_number?: string;
  [key: string]: any;
}

export class PayhubService {
  static async getPaymentStatus (uuid: string, userAuthorization: string): Promise<PaymentStatus> {
    const token = await this.createAuthToken();
    console.error('-------PayhubService PayhubService-------');
    const response = await wrappedFetch(`${payhubUrl}/card-payments/${uuid}/status`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${userAuthorization}`,
        ServiceAuthorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('-------PayhubService PayhubService Error-------');
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
