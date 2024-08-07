"use client";

import { useCurrentUser } from "~/hooks/use-current-user";
import { UserInfo } from "~/components/user-info";

export default function ClientPage() {
  const user = useCurrentUser();

  return <UserInfo user={user} label="👩 Client component" />;
}
