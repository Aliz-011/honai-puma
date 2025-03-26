import { dbsqlite as db } from "@/db";
import { decrypt, decryptToString, encrypt, encryptString } from "./encryption";
import { hashPassword } from "./password";
import { generateRandomRecoveryCode } from "./utils";
import { userTable, sessionTable } from "@/db/schema8";
import { and, count, eq } from "drizzle-orm";

export function verifyUsernameInput(username: string): boolean {
    return username.length > 3 && username.length < 32 && username.trim() === username;
}

export async function createUser(email: string, username: string, password: string): Promise<User> {
    const passwordHash = await hashPassword(password);
    const recoveryCode = generateRandomRecoveryCode();
    const encryptedRecoveryCode = encryptString(recoveryCode);

    const [row] = await db.insert(userTable).values({ email, username, password: passwordHash, recoveryCode: encryptedRecoveryCode }).returning({ id: userTable.id })

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

export async function updateUserEmailAndSetEmailAsVerified(userId: string, email: string): Promise<void> {
    await db.update(userTable).set({ email, emailVerified: 1 }).where(eq(userTable.id, userId))
}

export async function setUserAsEmailVerifiedIfEmailMatches(userId: string, email: string): Promise<boolean> {
    const result = await db.update(userTable)
        .set({ emailVerified: 1 })
        .where(and(eq(userTable.email, email), eq(userTable.id, userId)))
        .returning()

    return !!result[0];
}

export async function getUserPasswordHash(userId: string): Promise<string> {
    const [row] = await db.select({ password: userTable.password }).from(userTable).where(eq(userTable.id, userId))
    if (row === null) {
        throw new Error("Invalid user ID");
    }
    return row.password
}

export async function getUserRecoverCode(userId: string): Promise<string> {
    const [row] = await db.select({ recoveryCode: userTable.recoveryCode }).from(userTable).where(eq(userTable.id, userId))
    if (row === null) {
        throw new Error("Invalid user ID");
    }
    const encrypted = new Uint8Array(Object.values(row.recoveryCode));
    return decryptToString(encrypted);
}

export async function getUserTOTPKey(userId: string): Promise<Uint8Array | null> {
    const [row] = await db.select({ totpKey: userTable.totpKey }).from(userTable).where(eq(userTable.id, userId))
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
    await db.update(userTable).set({ totpKey: encrypted }).where(eq(userTable.id, userId))
}

export async function resetUserRecoveryCode(userId: string): Promise<string> {
    const recoveryCode = generateRandomRecoveryCode();
    const encrypted = encryptString(recoveryCode);
    await db.update(userTable).set({ recoveryCode: encrypted }).where(eq(userTable.id, userId))
    return recoveryCode;
}

export async function getUserFromUsername(username: string): Promise<User | null> {
    const [row] = await db.select().from(userTable).where(eq(userTable.username, username))
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