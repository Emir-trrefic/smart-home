import { randomUUID } from "node:crypto";

export interface User {
  id: string;
  username: string;
  passwordHash: string;
}

/** Depolama arayüzü. İlk uygulama bellekte, kalıcı veritabanı sonra bu arayüzün arkasına gelir. */
export interface UserStore {
  count(): Promise<number>;
  findByUsername(username: string): Promise<User | undefined>;
  findById(id: string): Promise<User | undefined>;
  create(input: { username: string; passwordHash: string }): Promise<User>;
}

export class InMemoryUserStore implements UserStore {
  private readonly byName = new Map<string, User>();
  private readonly byId = new Map<string, User>();

  async count(): Promise<number> {
    return this.byName.size;
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return this.byName.get(username.toLowerCase());
  }

  async findById(id: string): Promise<User | undefined> {
    return this.byId.get(id);
  }

  async create(input: { username: string; passwordHash: string }): Promise<User> {
    const key = input.username.toLowerCase();
    if (this.byName.has(key)) throw new Error("Kullanıcı zaten var");
    const user: User = { id: randomUUID(), ...input };
    this.byName.set(key, user);
    this.byId.set(user.id, user);
    return user;
  }
}
