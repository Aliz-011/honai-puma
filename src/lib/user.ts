import { db } from "@/db";
import { decrypt, decryptToString, encrypt, encryptString } from "./encryption";
import { hashPassword } from "./password";
import { generateRandomRecoveryCode } from "./utils";
import { users } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export function verifyUsernameInput(username: string): boolean {
    return username.length > 3 && username.length < 32 && username.trim() === username;
}

export async function createUser(email: string, username: string, password: string): Promise<User> {
    const passwordHash = await hashPassword(password);
    const recoveryCode = generateRandomRecoveryCode();
    const encryptedRecoveryCode = encryptString(recoveryCode);

    const [row] = await db.insert(users).values({ email, username, passwordHash, recoveryCode: encryptedRecoveryCode, }).$returningId()
    if (row === null) {
        throw new Error("Unexpected error");
    }

    const user: User = {
        id: row.id,
        username,
        email,
        emailVerified: false,
        registered2FA: false
    };
    return user;
}

export async function updateUserPassword(userId: string, password: string): Promise<void> {
    const passwordHash = await hashPassword(password);
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId))
}

export async function updateUserEmailAndSetEmailAsVerified(userId: string, email: string): Promise<void> {
    await db.update(users).set({ email, emailVerified: 1 }).where(eq(users.id, userId))
}

export async function setUserAsEmailVerifiedIfEmailMatches(userId: string, email: string): Promise<boolean> {
    const result = await db.update(users)
        .set({ emailVerified: 1 })
        .where(and(eq(users.email, email), eq(users.id, userId)))

    return !!result[0];
}

export async function getUserPasswordHash(userId: string): Promise<string> {
    const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId))
    if (row === null) {
        throw new Error("Invalid user ID");
    }
    return row.passwordHash
}

export async function getUserRecoverCode(userId: string): Promise<string> {
    const [row] = await db.select({ recoveryCode: users.recoveryCode }).from(users).where(eq(users.id, userId))
    if (row === null) {
        throw new Error("Invalid user ID");
    }
    const encrypted = new Uint8Array(Object.values(row.recoveryCode));
    return decryptToString(encrypted);
}

export async function getUserTOTPKey(userId: string): Promise<Uint8Array | null> {
    const [row] = await db.select({ totpKey: users.totpKey }).from(users).where(eq(users.id, userId))
    if (row === null) {
        throw new Error("Invalid user ID");
    }
    if (row.totpKey === null) {
        return null;
    }

    const encrypted = new Uint8Array(Object.values(row.totpKey).map(Number));
    return decrypt(encrypted);
}

export async function updateUserTOTPKey(userId: string, key: Uint8Array): Promise<void> {
    const encrypted = encrypt(key);
    await db.update(users).set({ totpKey: encrypted }).where(eq(users.id, userId))
}

export async function resetUserRecoveryCode(userId: string): Promise<string> {
    const recoveryCode = generateRandomRecoveryCode();
    const encrypted = encryptString(recoveryCode);
    await db.update(users).set({ recoveryCode: encrypted }).where(eq(users.id, userId))
    return recoveryCode;
}

export async function getUserFromEmail(email: string): Promise<User | null> {
    const [row] = await db.select().from(users).where(eq(users.email, email))
    if (row === null) {
        return null;
    }
    const user: User = {
        id: row.id,
        email: row.email,
        username: row.username,
        emailVerified: Boolean(row.emailVerified),
        registered2FA: Boolean(row.totpKey !== null ? 1 : 0)
    };
    return user;
}


export interface User {
    id: string;
    email: string;
    username: string;
    emailVerified: boolean;
    registered2FA: boolean;
}