import { UsersClient } from "./_components/UsersClient";

export const revalidate = 60;

export default function AdminUsersPage() {
  return <UsersClient />;
}
