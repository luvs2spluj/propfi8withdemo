// Gmail API Integration Service
export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface EmailMessage {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export interface GmailAuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export class GmailService {
  private static config: GmailConfig | null = null;
  private static accessToken: string | null = null;
  private static refreshToken: string | null = null;

  // Initialize Gmail service with configuration
  static initialize(config: GmailConfig) {
    this.config = config;
    this.loadStoredTokens();
  }

  // Load stored tokens from localStorage
  private static loadStoredTokens() {
    try {
      const stored = localStorage.getItem('gmail_tokens');
      if (stored) {
        const tokens = JSON.parse(stored);
        this.accessToken = tokens.accessToken;
        this.refreshToken = tokens.refreshToken;
      }
    } catch (error) {
      console.error('Failed to load stored Gmail tokens:', error);
    }
  }

  // Store tokens in localStorage
  private static storeTokens(tokens: { accessToken: string; refreshToken: string }) {
    try {
      localStorage.setItem('gmail_tokens', JSON.stringify(tokens));
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
    } catch (error) {
      console.error('Failed to store Gmail tokens:', error);
    }
  }

  // Clear stored tokens
  static clearTokens() {
    localStorage.removeItem('gmail_tokens');
    this.accessToken = null;
    this.refreshToken = null;
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Get authorization URL for OAuth2 flow
  static getAuthorizationUrl(): string {
    if (!this.config) {
      throw new Error('Gmail service not initialized');
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  // Exchange authorization code for tokens
  static async exchangeCodeForTokens(code: string): Promise<GmailAuthResult> {
    if (!this.config) {
      throw new Error('Gmail service not initialized');
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.config.redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const tokens = await response.json();
      
      this.storeTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        tokenType: tokens.token_type,
      };
    } catch (error) {
      console.error('Failed to exchange code for tokens:', error);
      throw error;
    }
  }

  // Refresh access token
  static async refreshAccessToken(): Promise<string> {
    if (!this.config || !this.refreshToken) {
      throw new Error('Gmail service not initialized or no refresh token');
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const tokens = await response.json();
      this.accessToken = tokens.access_token;

      // Update stored tokens
      this.storeTokens({
        accessToken: tokens.access_token,
        refreshToken: this.refreshToken,
      });

      return tokens.access_token;
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw error;
    }
  }

  // Get valid access token (refresh if needed)
  private static async getValidAccessToken(): Promise<string> {
    if (!this.accessToken) {
      throw new Error('No access token available. Please authenticate first.');
    }

    try {
      // Try to use current token
      return this.accessToken;
    } catch (error) {
      // If token is invalid, try to refresh
      try {
        return await this.refreshAccessToken();
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        throw new Error('Authentication expired. Please re-authenticate.');
      }
    }
  }

  // Send email using Gmail API
  static async sendEmail(message: EmailMessage): Promise<string> {
    const accessToken = await this.getValidAccessToken();

    try {
      // Create email message in Gmail format
      const emailLines = [];
      emailLines.push(`To: ${message.to}`);
      
      if (message.cc) {
        emailLines.push(`Cc: ${message.cc}`);
      }
      
      if (message.bcc) {
        emailLines.push(`Bcc: ${message.bcc}`);
      }
      
      emailLines.push(`Subject: ${message.subject}`);
      emailLines.push('Content-Type: text/html; charset=utf-8');
      emailLines.push('');
      emailLines.push(message.body);

      const rawMessage = emailLines.join('\n');
      const encodedMessage = btoa(rawMessage).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to send email: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      return result.id;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  // Get user profile
  static async getUserProfile(): Promise<any> {
    const accessToken = await this.getValidAccessToken();

    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get user profile: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  }

  // Get email threads
  static async getEmailThreads(maxResults = 10): Promise<any[]> {
    const accessToken = await this.getValidAccessToken();

    try {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=${maxResults}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get email threads: ${response.statusText}`);
      }

      const result = await response.json();
      return result.threads || [];
    } catch (error) {
      console.error('Failed to get email threads:', error);
      throw error;
    }
  }

  // Get specific email message
  static async getEmailMessage(messageId: string): Promise<any> {
    const accessToken = await this.getValidAccessToken();

    try {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get email message: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get email message:', error);
      throw error;
    }
  }

  // Search emails
  static async searchEmails(query: string, maxResults = 10): Promise<any[]> {
    const accessToken = await this.getValidAccessToken();

    try {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to search emails: ${response.statusText}`);
      }

      const result = await response.json();
      return result.messages || [];
    } catch (error) {
      console.error('Failed to search emails:', error);
      throw error;
    }
  }
}

// Default Gmail configuration
export const defaultGmailConfig: GmailConfig = {
  clientId: import.meta.env.VITE_GMAIL_CLIENT_ID || '',
  clientSecret: import.meta.env.VITE_GMAIL_CLIENT_SECRET || '',
  redirectUri: `${window.location.origin}/auth/gmail/callback`,
  scopes: [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
  ],
};

// Initialize Gmail service with default config
GmailService.initialize(defaultGmailConfig);
