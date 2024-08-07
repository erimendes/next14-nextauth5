import { Resend } from "resend";

const appUrl = process.env.NEXT_PUBLIC_APP_URL;

const resend = new Resend(process.env.RESEND_API_KEY);
// const resendAppDomain = process.env.RESEND_APP_DOMAIN;

export const sendTwoFactorTokenEmail = async (email: string, token: string) => {
  await resend.emails.send({
    // from: `mail@${resendAppDomain}`,
    from: "onboarding@resend.dev",
    to: email,
    subject: "2FA Code",
    html: `<p>Your 2FA code: ${token}</p>`,
  });
};

export const sendVerificationEmail = async (email: string, token: string) => {
  const confirmLink = `${appUrl}/auth/new-verification?token=${token}`;

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "Confirm your email",
    html: `<p>Click <a href="${confirmLink}">here</a> to confirm your email.</p>`,
  });
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `${appUrl}/auth/new-password?token=${token}`;

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "Reset your password",
    html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
  });
};
