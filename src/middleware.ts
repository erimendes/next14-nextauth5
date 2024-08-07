// alternative solution for initial middleware setup
// import NextAuth from "next-auth";
// import { authOptions } from "~/lib/auth";
// export const { auth: middleware } = NextAuth(authOptions);

// only works if not using prisma adapter
// import { auth } from "~/lib/auth";

// separate auth options that don't work with middleware/edge because of prisma adapter
import NextAuth from "next-auth";
import authConfig from "./lib/auth.config";
import {
  DEFAULT_LOGIN_REDIRECT,
  apiAuthPrefix,
  authRoutes,
  publicRoutes,
} from "./routes";

// doesn't work: possible fix for url not updating to correct path after signOut
// import { NextResponse } from "next/server";

// extract the auth function, generated by NextAuth with the auth options that work with middleware/edge
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // console.log("ROUTE:", req.nextUrl.pathname);
  // console.log("IS LOGGED IN:", isLoggedIn);
  console.log("middleware", req.auth);

  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  if (isApiAuthRoute) {
    return null; // don't do anything
  }

  if (isAuthRoute) {
    // console.log("isAuthRoute", isAuthRoute);
    // console.log("isLoggedIn", isLoggedIn);
    if (isLoggedIn) {
      // console.log("isLoggedIn / req.auth", !!req.auth, req.auth);
      return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
    }
    return null; // don't do anything
  }

  if (!isLoggedIn && !isPublicRoute) {
    // per tutorial: but not updating the url to /auth/login after signOut
    // url is still /settings after signOut, causing login error when immediately logging back in | need to refresh page

    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }

    const encodedCallbackUrl = encodeURIComponent(callbackUrl);

    return Response.redirect(
      new URL(`/auth/login?callbackUrl=${encodedCallbackUrl}`, nextUrl),
    );

    // possible fixes for url not updating to correct path after signOut:

    // doesn't work:
    // const redirectUrl = new URL("/auth/login", nextUrl.origin);
    // return NextResponse.rewrite(new URL("/auth/login", nextUrl.origin));

    // doesn't work:
    // const redirectUrl = nextUrl.clone();
    // redirectUrl.pathname = "/auth/login";
    // return NextResponse.rewrite(redirectUrl);
  }

  // don' t do anything if doesn't match any of the configured routes
  return null;
});

export const config = {
  // test url path for middleware:
  // matcher: ["/auth/login", "/auth/register"], // test url path for middleware

  // auth.js docs:
  // matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"], // auth.js docs

  // clerk docs:
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"], // source: https://clerk.com/docs/quickstarts/nextjs?utm_source=sponsorship&utm_medium=youtube&utm_campaign=code-with-antonio&utm_content=12-31-2023#add-middleware-to-your-application
};
