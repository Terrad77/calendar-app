import passport from 'passport';
import { Strategy as GoogleStrategy, VerifyCallback } from 'passport-google-oauth20';
import { authService } from '../services/authService.js';
import { User } from '../types/auth.types';

// check required env variables
if (
  !process.env.GOOGLE_CLIENT_ID ||
  !process.env.GOOGLE_CLIENT_SECRET ||
  !process.env.GOOGLE_CALLBACK_URL
) {
  throw new Error(
    'Missing environment variables for Google OAuth: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_CALLBACK_URL.'
  );
}

// Setting up Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL, // Например: /api/auth/google/callback
      // Используем state: true для предотвращения CSRF-атак
      scope: ['profile', 'email'],
    },
    async (accessToken: string, refreshToken: string, profile: any, done: VerifyCallback) => {
      try {
        // Extract necessary data from Google profile
        const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
        const name = profile.displayName || profile.name.givenName;
        const googleId = profile.id;

        if (!email) {
          return done(new Error('Google profile missing email'), false);
        }
        // 1. Вызываем метод, который возвращает { user, tokens }
        const result = await authService.findOrCreateSocialUser({
          email,
          name,
          googleId,
        });

        // 2. Деструктурируем результат, чтобы получить объект User
        const user = result.user;
        // 3. (Опционально) Токены можно сохранить и использовать для дальнейшего вызова done
        // const authTokens = result.tokens;

        if (user) {
          // Passport передает 'user' в req.user. \
          //    В роуте /google/callback мы его обработаем.
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

// Поскольку мы используем JWT (Stateless), нам не нужно сериализовать/десериализовать пользователя,Однако Passport требует, чтобы эти функции были определены
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  // В Stateless API это не используется, но оставляем для полноты
  done(null, { id });
});

export default passport;
