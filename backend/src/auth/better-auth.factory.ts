import { expo } from '@better-auth/expo';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { dash } from '@better-auth/infra';
import type { PrismaClient } from '@prisma/client';
import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';

export type BetterAuthInstance = ReturnType<typeof createBetterAuth>;

export function createBetterAuth(
  prisma: PrismaClient,
  options: {
    secret: string;
    baseURL: string;
    trustedOrigins: string[];
    /** Better Auth Infrastructure dashboard API key (`ba_...`). */
    apiKey?: string;
  },
) {
  const baseOrigin = new URL(options.baseURL).origin;
  const mobileOrigins = [
    'chief://',
    'chief://*',
    // Expo Go / dev client may send exp:// origins during local testing
    'exp://',
    'exp://**',
    'exp://192.168.*.*:*/**',
    'exp://10.*.*.*:*/**',
  ];
  const trustedOrigins = Array.from(
    new Set([...options.trustedOrigins, baseOrigin, ...mobileOrigins]),
  );

  const plugins = [
    expo(),
    bearer(),
    ...(options.apiKey
      ? [
          dash({
            apiKey: options.apiKey,
          }),
        ]
      : []),
  ];

  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    secret: options.secret,
    baseURL: options.baseURL,
    basePath: '/api/auth',
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    user: {
      additionalFields: {
        onboardingCompleted: {
          type: 'boolean',
          required: false,
          defaultValue: false,
          input: false,
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    plugins,
  });
}
