import { getCurrentUserId } from "./session";
import { getUsers } from "./users";
import type { User } from "./users";

export async function getCurrentUser(): Promise<User | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const users = await getUsers();
  return users.find((u) => u.id === userId) ?? null;
}
