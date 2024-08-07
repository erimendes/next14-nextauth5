// NOTE: in the tutorial, this file is located in the root of the project (if not using src) or in the root of src (if using src)

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";

// tutorial solution
// import { UserRole } from "@prisma/client";
import authConfig from "~/lib/auth.config";
import { db } from "~/lib/db";
import { getUserById } from "~/data/user";
import { getTwoFactorConfirmationByUserId } from "~/data/two-factor-confirmation";
import { getAccountByUserId } from "~/data/account";

// auth.js docs solution for augmenting session type
// import { type DefaultSession } from "next-auth";
// declare module "next-auth" {
//   interface Session {
//     user: {
//       role: UserRole;
//     } & DefaultSession["user"];
//   }
// }

export const {
  handlers, // auth.js docs
  // handlers: { GET, POST }, // tutorial
  auth,
  signIn, // auth.js docs
  signOut, // auth.js docs
  unstable_update,
} = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  events: {
    // executes when an oauth account is linked to a user
    // its assumed that the oauth provider is reliable and already takes care to verify user's email, so we only need to verify the email for credentials provider (w/c doesnt fire linkAccount event on registration)
    async linkAccount({ user }) {
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
  },
  callbacks: {
    // async authorized({ auth, request }) {
    //   console.log("callback: authorized");
    //   console.log("auth", auth);
    //   console.log("request", request);
    //   return true;
    // },
    // async redirect({ url, baseUrl }) {
    //   console.log("callback: redirect");
    //   console.log("url", url);
    //   console.log("baseUrl", baseUrl);
    //   // Allows relative callback URLs
    //   if (url.startsWith("/")) return `${baseUrl}${url}`;
    //   // Allows callback URLs on the same origin
    //   else if (new URL(url).origin === baseUrl) return url;
    //   return baseUrl;
    // },
    async signIn({ user, account }) {
      console.log("callback: signIn");
      // console.log("signIn callback user argument:", { user, account });

      // skip email verification for providers other than credentials
      // account?.type !== "credentials" also works
      if (account?.provider !== "credentials") return true;

      const existingUser = await getUserById(user.id as string);
      // if credentials provider and email not verified
      if (!existingUser?.emailVerified) return false;

      // 2FA check
      if (existingUser.isTwoFactorEnabled) {
        const twoFactorConfirmation = await getTwoFactorConfirmationByUserId(
          existingUser.id,
        );

        // console.log({ twoFactorConfirmation });

        if (!twoFactorConfirmation) return false;

        // Delete two factor confirmation for next sign in
        await db.twoFactorConfirmation.delete({
          where: { id: twoFactorConfirmation.id },
        });
      }

      return true;
    },
    // async signIn({ user }) {
    //   console.log({ "signIn callback user argument": user });

    //   // tutorial code: this is unnecessary query since user is already passed from the credentials provider's authorize function
    //   // we can just comment this out and proceed to conditional check
    //   // const existingUser = await getUserById(user.id);

    //   const existingUser = user;
    //   if (!existingUser || !existingUser.emailVerified) return false;

    //   return true;
    // },
    async jwt({ token, user, profile, trigger }) {
      console.log("callback: jwt");
      if (!token.sub) return token;

      const existingUser = await getUserById(token.sub);

      if (!existingUser) return token;

      const existingAccount = await getAccountByUserId(existingUser.id);

      token.role = existingUser.role;
      token.isTwoFactorEnabled = existingUser.isTwoFactorEnabled;

      // model fields that can be updated by the user in the settings page
      token.name = existingUser.name;
      token.email = existingUser.email;

      // type coercion to boolean
      token.isOAuth = !!existingAccount;

      // console.log({ "jwt token": token });
      return token;
    },
    async session({ token, session }) {
      console.log("callback: session");
      // console.log({ session });
      // if (session.user) { // tutorial
      // should also check if token.customField exists
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      if (session.user && token.role) {
        // tutorial solution since he couldn't augment JWT token
        // session.user.role = token.role as UserRole;

        // auth.js docs solution
        session.user.role = token.role;
      }

      if (session.user) {
        // tutorial solution but not needed since we augmented JWT token to include isTwoFactorEnabled's type
        // session.user.isTwoFactorEnabled = token.isTwoFactorEnabled as boolean;

        session.user.isTwoFactorEnabled = token.isTwoFactorEnabled;
      }

      // model fields that can be updated by the user in the settings page
      if (session.user) {
        session.user.name = token.name;
        session.user.email = token.email as string;
        session.user.isOAuth = token.isOAuth;
      }

      // alternative solution
      // if (session.user && token.sub) {
      //   const modifiedSession = {
      //     ...session,
      //     user: { ...session.user, id: token.sub },
      //   };
      //   console.log({ "session token": token, modifiedSession });
      //   return modifiedSession;
      // }

      // console.log({ "session token": token, session });
      return session;
    },
  },
});

// alternative solution for initial middleware setup
// export const authOptions = { providers: [Github] };
// export const {
//   handlers,
//   auth,
// } = NextAuth(authOptions);

// per tutorial: auth.ts (containing next-auth options) and auth.config.ts file are located at src/ root dir, while this utility function is located at src/lib/auth.ts
export const currentUser = async () => {
  const session = await auth();

  return session?.user;
};

// for getting current user's role on server side (server components and actions)
export const currentRole = async () => {
  const session = await auth();

  return session?.user?.role;
};
