import passport from 'passport';
import { Strategy as GoogleStrategy, VerifyCallback } from 'passport-google-oauth20';
import { authService } from '../services/authService';
import { User } from '../types/auth.types';

export const isGoogleOAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
);

// Setting up Google Strategy
if (isGoogleOAuthConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        callbackURL: process.env.GOOGLE_CALLBACK_URL as string,
        //using state: true for prevent CSRF attacks
        scope: ['email', 'profile'],
      },
      async (accessToken: string, refreshToken: string, profile: any, done: VerifyCallback) => {
        try {
          // Extract necessary data from Google profile
          const email =
            profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
          const name = profile.displayName || profile.name.givenName;
          const googleId = profile.id;

          if (!email) {
            return done(new Error('Google profile missing email'), false);
          }
          // 1. Call the method that returns { user, tokens }
          const result = await authService.findOrCreateSocialUser({
            email,
            name,
            googleId,
          });

          // 2. Destructure the result to get the User object
          const user = result.user;
          // 3. (Optional) Tokens can be saved and used for further calls to done
          // const authTokens = result.tokens;

          if (user) {
            // Passport sends 'user' to req.user. \
            // In the /google/callback route we will process it.
            return done(null, user);
          } else {
            return done(new Error('Failed to process user after Google auth'), false);
          }
        } catch (err) {
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

// Since we use JWT (Stateless), we don't need to serialize/deserialize the user, but Passport requires these functions to be defined
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  // Stateless API doesn't use this, but we keep it for completeness
  done(null, { id });
});

export default passport;
