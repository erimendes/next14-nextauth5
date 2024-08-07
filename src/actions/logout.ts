"use server";

import { signOut } from "~/lib/auth";

export const logout = async () => {
  // do some server stuff before signing out user
  await signOut({ redirectTo: "/auth/login" });
};
