"use server";

import * as z from "zod";
import { AuthError } from "next-auth";

import { LoginSchema } from "~/schemas";
import { signIn } from "~/lib/auth";
import { DEFAULT_LOGIN_REDIRECT } from "~/routes";
import {
  generateVerificationToken,
  generateTwoFactorToken,
} from "~/lib/tokens";
import { sendVerificationEmail, sendTwoFactorTokenEmail } from "~/lib/mail";
import { db } from "~/lib/db";
import { getUserByEmail } from "~/data/user";
import { getTwoFactorConfirmationByUserId } from "~/data/two-factor-confirmation";
import { getTwoFactorTokenByEmail } from "~/data/two-factor-token";

export const login = async (
  values: z.infer<typeof LoginSchema>,
  callbackUrl?: string | null,
) => {
  const validatedFields = LoginSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid fields!" };
  }

  const { email, password, code } = validatedFields.data;

  const existingUser = await getUserByEmail(email);

  if (!existingUser || !existingUser.email || !existingUser.password) {
    // Either user/email does not exist or user signed in with OAuth
    return { error: "Email does not exist! / Pls. sign in with OAuth!" };
  }

  if (!existingUser.emailVerified) {
    const verificationToken = await generateVerificationToken(
      existingUser.email,
    );

    // no need to check if entered password matches db record, since this will be done in Credentials authorize() and we are mainly concerned with checking if user's email has been verified before allowing login, at this point
    await sendVerificationEmail(
      verificationToken.email,
      verificationToken.token,
    );

    return { success: "Confirmation email sent!" };
  }

  if (existingUser.isTwoFactorEnabled && existingUser.email) {
    if (code) {
      const twoFactorToken = await getTwoFactorTokenByEmail(existingUser.email);

      if (!twoFactorToken) return { error: "Invalid code!" };

      if (twoFactorToken.token !== code) return { error: "Invalid code!" };

      const hasExpired = new Date(twoFactorToken.expires) < new Date();

      if (hasExpired) return { error: "Code expired!" };

      await db.twoFactorToken.delete({ where: { id: twoFactorToken.id } });

      const existingConfirmation = await getTwoFactorConfirmationByUserId(
        existingUser.id,
      );

      if (existingConfirmation) {
        await db.twoFactorConfirmation.delete({
          where: { id: existingConfirmation.id },
        });
      }

      await db.twoFactorConfirmation.create({
        data: {
          userId: existingUser.id,
        },
      });
    } else {
      const twoFactorToken = await generateTwoFactorToken(existingUser.email);
      await sendTwoFactorTokenEmail(twoFactorToken.email, twoFactorToken.token);

      // when 2FA token has been emailed to user, login form should update to allow user to enter 2FA token
      return { twoFactor: true };
    }
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl || DEFAULT_LOGIN_REDIRECT,
    }); // explicitly setting the redirect (for clarity), even though middleware will redirect if user is logged in
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials!" };
        default:
          return { error: "Something went wrong!" };
      }
    }

    // next.js requires to throw the error, otherwise, it won't redirect
    throw error;
  }

  // Unnecessary since will be redirected on successful login
  // return { success: "Email sent!" };
};

// signIn() for use in server component or server action
// export const oauthLogin = async (provider: string) => {
//   try {
//     await signIn(provider, { redirectTo: DEFAULT_LOGIN_REDIRECT });
//   } catch (error) {
//     if (error instanceof AuthError) {
//       switch (error.type) {
//         case "OAuthSignInError":
//           return {
//             error: `Invalid ${provider} credentials!`,
//           };
//         default:
//           return {
//             error: "Something went wrong!",
//           };
//       }
//     }
//     throw error;
//   }
//   return { success: "Succcessfully logged in!" };
// };
