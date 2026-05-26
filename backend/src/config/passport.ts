import passport from 'passport';
import { Strategy as GoogleStrategy, VerifyCallback, type Profile } from 'passport-google-oauth20';
import type { SocialUserData } from '../types/auth.types.js';

export const isGoogleOAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
);

// Setting up Google Strategy
if (isGoogleOAuthConfigured) {
  console.log('✅ Google OAuth configuration detected. Activating Google Strategy...');
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        callbackURL: process.env.GOOGLE_CALLBACK_URL as string,
        //using state: true for prevent CSRF attacks
        scope: ['email', 'profile'],
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: VerifyCallback
      ) => {
        try {
          const email =
            profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
          const name = profile.displayName || profile.name?.givenName || 'Unknown User';
          const googleId = profile.id;

          if (!email) {
            console.error('Google Auth Error: Profile missing email');
            return done(new Error('Google profile missing email'), false);
          }

          const socialUserData: SocialUserData = {
            email,
            name,
            googleId,
          };

          return done(null, socialUserData as any);
        } catch (err) {
          console.error('Google Strategy Error:', err);
          return done(err);
        }
      }
    )
  );
} else {
  console.warn(
    'Google OAuth is disabled: set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL to enable it.'
  );
}

// Stateless API (no need for serialize/deserialize, but Passport requires them)
passport.serializeUser(((user: any, done: (err: any, id?: unknown) => void) => {
  done(null, user?.id);
}) as any);

passport.deserializeUser(((id: string, done: (err: any, user?: any) => void) => {
  // Stateless API doesn't use this, but we keep it for completeness
  done(null, { id } as any);
}) as any);

export default passport;
