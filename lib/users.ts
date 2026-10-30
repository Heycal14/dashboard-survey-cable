import { promises as fs } from "fs";
import path from "path";
import { pool } from "./db";

const DB_PATH = path.join(process.cwd(), "data", "users.json");

export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  username?: string;
  role?: string;
  status?: string;
};

export async function getUsers(): Promise<User[]> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveUsers(users: User[]): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(users, null, 2));
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const users = await getUsers();
  const local = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (local) return local;

  // Ponytail: fallback lookup PG table users if not found in JSON
  const pgUser = await findUserInDatabase(email);
  return pgUser;
}

export async function findUserInDatabase(
  identifier: string,
): Promise<User | null> {
  try {
    const res = await pool.query(
      `SELECT id, username, email, full_name, password_hash, role, status
       FROM users
       WHERE (username = $1 OR email = $1)
       LIMIT 1`,
      [identifier],
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      email: row.email || row.username,
      name: row.full_name || row.username,
      username: row.username,
      passwordHash: row.password_hash,
      role: row.role,
      status: row.status,
    };
  } catch (error) {
    console.error("findUserInDatabase error:", error);
    return null;
  }
}

export async function findUserById(id: string): Promise<User | null> {
  // 1. Check local json
  const users = await getUsers();
  const local = users.find((u) => u.id === id);
  if (local) return local;

  // 2. Check PG users
  try {
    const res = await pool.query(
      `SELECT id, username, email, full_name, role, status
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      email: row.email || row.username,
      name: row.full_name || row.username,
      username: row.username,
      role: row.role,
      status: row.status,
    };
  } catch (error) {
    console.error("findUserById error:", error);
    return null;
  }
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
