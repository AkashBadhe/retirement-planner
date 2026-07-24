import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { AuthProvider } from '../../user/schemas/user.schema';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    // Use placeholder values if env vars are not set — the strategy will
    // instantiate without crashing. The /auth/github route simply won't work
    // until real credentials are configured.
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID') || 'not-configured',
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET') || 'not-configured',
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL') || 'http://localhost:4000/api/auth/github/callback',
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ): Promise<any> {
    const { id, emails, displayName, photos } = profile;

    // GitHub returns emails as an array
    const email = emails?.[0]?.value;

    if (!email) {
      return done(new Error('No email found from GitHub'), false);
    }

    const [firstName, ...lastNameParts] = displayName?.split(' ') || ['', ''];

    const user = {
      id,
      email,
      firstName: firstName || displayName,
      lastName: lastNameParts.join(' ') || '',
      avatar: photos?.[0]?.value,
    };

    try {
      const tokens = await this.authService.validateOAuthLogin(
        user,
        AuthProvider.GITHUB,
      );
      done(null, tokens);
    } catch (error) {
      done(error, false);
    }
  }
}
