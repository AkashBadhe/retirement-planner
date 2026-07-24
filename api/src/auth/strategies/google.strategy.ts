import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { AuthProvider } from '../../user/schemas/user.schema';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || 'not-configured',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || 'not-configured',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:4000/api/auth/google/callback',
      scope: ['openid', 'email', 'profile'],
      userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, name, photos, _json } = profile;

    let email = emails?.[0]?.value || _json?.email;

    // Fallback: fetch userinfo with access token if email missing
    if (!email) {
      try {
        const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          email = data?.email;
        }
      } catch {
        // ignore, handled below
      }
    }

    if (!email) {
      return done(new Error('No email returned from Google. Ensure the email scope is granted.'), false);
    }

    const user = {
      id,
      email,
      firstName: name?.givenName,
      lastName: name?.familyName,
      avatar: photos?.[0]?.value,
    };

    try {
      console.log('[GoogleStrategy] validate() for email:', email);
      const tokens = await this.authService.validateOAuthLogin(
        user,
        AuthProvider.GOOGLE,
      );
      console.log('[GoogleStrategy] validateOAuthLogin success, tokens generated:', !!tokens?.accessToken);
      done(null, tokens);
    } catch (error: any) {
      console.error('[GoogleStrategy] validateOAuthLogin FAILED:', error?.message, error?.stack);
      done(error, false);
    }
  }
}
