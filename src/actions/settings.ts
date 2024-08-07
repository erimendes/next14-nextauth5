"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";

import { db } from "~/lib/db";
import { SettingsSchema } from "~/schemas";
import { getUserById, getUserByEmail } from "~/data/user";
import { currentUser } from "~/lib/auth";
// import { unstable_update } from "~/lib/auth";
import { generateVerificationToken } from "~/lib/tokens";
import { sendVerificationEmail } from "~/lib/mail";

export const settings = async (values: z.infer<typeof SettingsSchema>) => {
  const user = await currentUser();

  if (!user) return { error: "Unauthorized!" };

  const dbUser = await getUserById(user.id as string);

  if (!dbUser) return { error: "Unauthorized!" };

  // users who signed in with OAuth should not be able to modify these fields
  if (user.isOAuth) {
    values.email = undefined;
    values.password = undefined;
    values.newPassword = undefined;
    values.isTwoFactorEnabled = undefined;
  }

  // email update checks
  if (values.email && values.email !== user.email) {
    const existingUser = await getUserByEmail(values.email);

    if (existingUser && existingUser.id !== user.id) {
      return { error: "Email already in use!" };
    }

    const verificationToken = await generateVerificationToken(values.email);
    await sendVerificationEmail(
      verificationToken.email,
      verificationToken.token,
    );

    return { success: "Verification email sent!" };
  }

  // password update checks
  if (values.password && values.newPassword && dbUser.password) {
    const passwordsMatch = await bcrypt.compare(
      values.password,
      dbUser.password,
    );

    if (!passwordsMatch) {
      return { error: "Incorrect password!" };
    }

    const hashedPassword = await bcrypt.hash(values.newPassword, 10);

    values.password = hashedPassword;
    values.newPassword = undefined;
  }

  const updatedUser = await db.user.update({
    where: { id: dbUser.id },
    data: { ...values },
  });

  // only needed to update session, server-side for server components
  // client components need to update session from the client
  // unstable_update({ user: updatedUser });
  // or
  // only pass User fields that are stored in session
  // unstable_update({
  //   user: {
  //     name: updatedUser.name,
  //     email: updatedUser.email,
  //     isTwoFactorEnabled: updatedUser.isTwoFactorEnabled,
  //     role: updatedUser.role,
  //   },
  // });

  return { success: "Settings updated!" };
};
