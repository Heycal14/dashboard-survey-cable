import { promises as fs } from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "users.json");

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
};

export async function getUsers(): Promise<User[]> {
  const raw = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

export async function saveUsers(users: User[]): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(users, null, 2));
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const users = await getUsers();
  return users.find((u) => u.email === email) ?? null;
}

export async function createUser(data: Omit<User, "id">): Promise<User> {
  const users = await getUsers();
  const user: User = {
    id: crypto.randomUUID(),
    ...data,
  };
  users.push(user);
  await saveUsers(users);
  return user;
}
