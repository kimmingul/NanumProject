import { Logger } from '../utils/logger.js';

interface CognitoTokenResponse {
  AuthenticationResult: {
    AccessToken: string;
    IdToken: string;
    TokenType: string;
    ExpiresIn: number;
  };
}

interface CognitoAuthConfig {
  region: string;
  userPoolId: string;
  clientId: string;
  refreshToken: string;
}

export class CognitoAuth {
  private config: CognitoAuthConfig;
  private logger: Logger;
  private currentIdToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: CognitoAuthConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Get a valid idToken, refreshing if necessary.
   * Returns the JWT idToken to use as Bearer token.
   */
  async getToken(): Promise<string> {
    // If we have a valid token with at least 5 minutes remaining, use it
    if (this.currentIdToken && Date.now() < this.tokenExpiresAt - 5 * 60 * 1000) {
      return this.currentIdToken;
    }

    this.logger.info('Refreshing Cognito idToken...');
    await this.refreshToken();
    return this.currentIdToken!;
  }

  private async refreshToken(): Promise<void> {
    const cognitoUrl = `https://cognito-idp.${this.config.region}.amazonaws.com/`;

    const body = {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: this.config.clientId,
      AuthParameters: {
        REFRESH_TOKEN: this.config.refreshToken,
      },
    };

    const response = await fetch(cognitoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Cognito token refresh failed (HTTP ${response.status}): ${errorText}`,
      );
    }

    const data = (await response.json()) as CognitoTokenResponse;
    const result = data.AuthenticationResult;

    this.currentIdToken = result.IdToken;
    this.tokenExpiresAt = Date.now() + result.ExpiresIn * 1000;

    this.logger.info('Cognito idToken refreshed successfully', {
      expiresIn: result.ExpiresIn,
      expiresAt: new Date(this.tokenExpiresAt).toISOString(),
    });
  }
}
