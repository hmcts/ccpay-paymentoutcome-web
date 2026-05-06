import wrappedFetch from '../../app/client/request';
const config = require('config');
const otp = require('otp');
const s2sUrl =  config.get('s2s.url');
const payhubUrl =  config.get('payhub.url');
const paymentoutcomeSecret = config.get('secrets.ccpay.paymentoutcome-s2s-web');
const microService = config.get('security.clientId');
const idamUrl = config.get('idam.url') as string;
export interface PaymentStatus {
  status: string;
  reference?: string;
  ccd_case_number?: string;
  [key: string]: any;
}

export class PayhubService {

  private static normalizeAuthHeader(tokenOrHeader: string): string {
    if (!tokenOrHeader) {
      throw new Error('Missing user authorization token');
    }
    return tokenOrHeader.startsWith('Bearer ') ? tokenOrHeader : `Bearer ${tokenOrHeader}`;
  }

  static async getPaymentStatus (uuid: string, userAuthorization: string): Promise<PaymentStatus> {
    const authHeader = this.normalizeAuthHeader(userAuthorization);
    await this.validateUserToken(authHeader);
    const token = await this.createAuthToken();
    const response = await wrappedFetch(`${payhubUrl}/card-payments/${uuid}/status`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        ServiceAuthorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch payment status: ${response.statusText}`);
    }
    return response.json();
  }

  static async validateUserToken(userAuthorization: string): Promise<void> {
      const response = await wrappedFetch(`${idamUrl}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: userAuthorization,
        },
      });

      if (response.ok) {
        try {
          const body: any = await response.json();
          if (body == null || body === '') {
            console.error('IDAM validation returned empty body');
            throw new Error('IDAM validation returned empty body');
          }
        } catch (err) {
          console.error('IDAM validation returned non-JSON or empty response', err);
          throw err;
        }
        return;
    } else {
      throw new Error(`Failed to get auth token: ${response.statusText}  ${response.status}` );
    }
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
