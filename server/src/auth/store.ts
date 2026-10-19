import { randomUUID } from "node:crypto";
import type { Role } from "./tokens.js";

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: Role;
}

/** Depolama arayüzü. İlk uygulama bellekte, kalıcı veritabanı sonra bu arayüzün arkasına gelir. */
export interface UserStore {
  count(): Promise<number>;
  findByUsername(username: string): Promise<User | undefined>;
  create(input: { username: string; passwordHash: string; role: Role }): Promise<User>;
}

export class InMemoryUserStore implements UserStore {
  private readonly users = new Map<string, User>();

  async count(): Promise<number> {
    return this.users.size;
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return this.users.get(username.toLowerCase());
  }

  async create(input: { username: string; passwordHash: string; role: Role }): Promise<User> {
    const key = input.username.toLowerCase();
    if (this.users.has(key)) throw new Error("Kullanıcı zaten var");
    const user: User = { id: randomUUID(), ...input };
    this.users.set(key, user);
    return user;
  }
}
