import NextAuth from "next-auth"; // tutorial code but doesn't seem to be needed

import { type DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt"; // auth.js docs

import { UserRole } from "@prisma/client";

// does not export the ExtendedUser type
// declare module "next-auth" {
//   interface Session {
//     user: {
//       role: UserRole;
//     } & DefaultSession["user"];
//   }
// }

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    isTwoFactorEnabled: boolean;
    isOAuth: boolean;
  }
}

// alternative: tutorial solution for augmenting session type
// exports the ExtendedUser type
export type ExtendedUser = DefaultSession["user"] & {
  role: UserRole;
  isTwoFactorEnabled: boolean;
  isOAuth: boolean;
};

// isn't this the correct way to add the type or the order doesn't matter?
// export type ExtendedUser = {
//   role: UserRole;
//   isTwoFactorEnabled: boolean;
// } & DefaultSession["user"];

declare module "next-auth" {
  interface Session {
    user: ExtendedUser;
  }
}
