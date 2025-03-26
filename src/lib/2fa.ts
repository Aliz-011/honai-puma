import { and, eq } from 'drizzle-orm';
import { decryptToString, encryptString } from './encryption';
import { ExpiringTokenBucket } from './rate-limit';
import { generateRandomRecoveryCode } from './utils';
import { sessionTable, userTable } from '@/db/schema8';
import { dbsqlite as db } from '@/db';

export const totpBucket = new ExpiringTokenBucket<string>(5, 60 * 30);
export const recoveryCodeBucket = new ExpiringTokenBucket<string>(3, 60 * 60);

export async function resetUser2FAWithRecoveryCode(
    userId: string,
    recoveryCode: string
): Promise<boolean> {
    // Note: In Postgres and MySQL, these queries should be done in a transaction using SELECT FOR UPDATE
    const [row] = await db
        .select({ recoveryCode: userTable.recoveryCode })
        .from(userTable)
        .where(eq(userTable.id, userId));
    if (row === null) {
        return false;
    }
    const encryptedRecoveryCode = row.recoveryCode;
    const userRecoveryCode = decryptToString(encryptedRecoveryCode);
    if (recoveryCode !== userRecoveryCode) {
        return false;
    }

    const newRecoveryCode = generateRandomRecoveryCode();
    const encryptedNewRecoveryCode = encryptString(newRecoveryCode);
    await db
        .update(sessionTable)
        .set({ twoFactorVerified: 0 })
        .where(eq(sessionTable.userId, userId));
    // Compare old recovery code to ensure recovery code wasn't updated.
    const [result] = await db
        .update(userTable)
        .set({ recoveryCode: encryptedNewRecoveryCode, totpKey: null })
        .where(
            and(
                eq(userTable.id, userId),
                eq(userTable.recoveryCode, encryptedRecoveryCode)
            )
        )
        .returning({ id: userTable.id })


    return !!result.id
}