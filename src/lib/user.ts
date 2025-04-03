import { db } from "@/db";
import { hashPassword } from "./password";
import { userTable } from "@/db/schema";
import { count, eq } from "drizzle-orm";

export function verifyUsernameInput(username: string): boolean {
    return username.length > 3 && username.length < 32 && username.trim() === username;
}

export async function createUser(email: string, username: string, password: string): Promise<User> {
    const passwordHash = await hashPassword(password);

    const [row] = await db.insert(userTable).values({ email, username, password: passwordHash }).$returningId()

    if (row === null) {
        throw new Error("Unexpected error");
    }

    const user: User = {
        id: row.id,
        username,
        email
    };
    return user;
}

export const checkEmailAvailability = async (email: string) => {
    const row = await db
        .select({ count: count() })
        .from(userTable)
        .where(eq(userTable.email, email));

    return row[0].count === 0;
};

export async function updateUserPassword(userId: string, password: string): Promise<void> {
    const passwordHash = await hashPassword(password);
    await db.update(userTable).set({ password: passwordHash }).where(eq(userTable.id, userId))
}

export async function updateUserEmail(userId: string, email: string): Promise<void> {
    await db.update(userTable).set({ email }).where(eq(userTable.id, userId))
}

export async function getUserPasswordHash(userId: string): Promise<string> {
    const [row] = await db.select({ password: userTable.password }).from(userTable).where(eq(userTable.id, userId))
    if (row === null) {
        throw new Error("Invalid user ID");
    }
    return row.password
}

export async function getUserFromUsername(username: string): Promise<User | null> {
    const [row] = await db.select().from(userTable).where(eq(userTable.username, username))
    if (row === null) {
        return null;
    }
    const user: User = {
        id: row.id,
        email: row.email,
        username: row.username
    };
    return user;
}


export interface User {
    id: string;
    email: string;
    username: string;
}