import { getCurrentUserId } from "./session";
import { findUserById } from "./users";
import type { User } from "./users";

export async function getCurrentUser(): Promise<User | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  return await findUserById(userId);
}
