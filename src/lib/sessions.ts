import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { cookies } from "next/headers";

import { sessionTable, userTable } from "@/db/schema";
import { db } from "@/db";
import { User } from "./user";

export function generateSessionToken(): string {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    const token = encodeBase32LowerCaseNoPadding(bytes);
    return token;

}

export async function createSession(token: string, userId: string): Promise<Session> {
    const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
    const session: Session = {
        id: sessionId,
        userId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    };

    await db.insert(sessionTable).values({
        id: sessionId,
        userId: session.userId,
        expiresAt: session.expiresAt,
    });

    return session;
}

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
    const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
    const result = await db
        .select({ user: userTable, session: sessionTable })
        .from(sessionTable)
        .innerJoin(userTable, eq(sessionTable.userId, userTable.id))
        .where(eq(sessionTable.id, sessionId));

    if (result.length < 1) {
        return { session: null, user: null };
    }

    const { user, session } = result[0];

    const sessionNew: Session = {
        id: session.id,
        expiresAt: session.expiresAt,
        userId: session.userId,
    };

    const userNew: User = {
        id: user.id,
        email: user.email,
        username: user.username
    };

    if (Date.now() >= session.expiresAt.getTime()) {
        await db.delete(sessionTable).where(eq(sessionTable.id, session.id));
        return { session: null, user: null };
    }

    if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
        session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
        await db
            .update(sessionTable)
            .set({
                expiresAt: session.expiresAt
            })
            .where(eq(sessionTable.id, session.id));
    }
    return { session: sessionNew, user: userNew };

}

export async function invalidateSession(sessionId: string): Promise<void> {
    await db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
}

export async function invalidateAllSessionTable(userId: string): Promise<void> {
    await db.delete(sessionTable).where(eq(sessionTable.userId, userId));
}

export const getCurrentSession = cache(async (): Promise<SessionValidationResult> => {
    const cookieStore = await cookies();
    const token = cookieStore.get("honai-session")?.value ?? null;
    if (token === null) {
        return { session: null, user: null };
    }
    const result = await validateSessionToken(token);
    return result;
});

export interface Session {
    id: string;
    expiresAt: Date;
    userId: string;
}

export type SessionValidationResult =
    | { session: Session; user: User }
    | { session: null; user: null };
