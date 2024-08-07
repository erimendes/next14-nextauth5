"use client";

import { logout } from "~/actions/logout";

// alternatively, use client-side signOut() from next-auth/react
// import { signOut } from "next-auth/react";

interface LogoutButtonProps {
  children: React.ReactNode;
}

export function LogoutButton({ children }: LogoutButtonProps) {
  const onClick = () => {
    logout();

    // alternatively, use client-side signOut() from next-auth/react
    // signOut();
  };

  return (
    <span onClick={onClick} className="cursor-pointer">
      {children}
    </span>
  );
}
