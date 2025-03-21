// import { and, eq } from 'drizzle-orm';
// import { decryptToString, encryptString } from './encryption';
// import { ExpiringTokenBucket } from './rate-limit';
// import { generateRandomRecoveryCode } from './utils';
// import { sessions, users } from '@/db/schema';
// import { db } from '@/db';

// export const totpBucket = new ExpiringTokenBucket<string>(5, 60 * 30);
// export const recoveryCodeBucket = new ExpiringTokenBucket<string>(3, 60 * 60);

// export async function resetUser2FAWithRecoveryCode(
//     userId: string,
//     recoveryCode: string
// ): Promise<boolean> {
//     // Note: In Postgres and MySQL, these queries should be done in a transaction using SELECT FOR UPDATE
//     const [row] = await db
//         .select({ recoveryCode: users.recoveryCode })
//         .from(users)
//         .where(eq(users.id, userId));
//     if (row === null) {
//         return false;
//     }
//     const encryptedRecoveryCode = row.recoveryCode;
//     const userRecoveryCode = decryptToString(encryptedRecoveryCode);
//     if (recoveryCode !== userRecoveryCode) {
//         return false;
//     }

//     const newRecoveryCode = generateRandomRecoveryCode();
//     const encryptedNewRecoveryCode = encryptString(newRecoveryCode);
//     await db
//         .update(sessions)
//         .set({ twoFactorVerified: 0 })
//         .where(eq(sessions.userId, userId));
//     // Compare old recovery code to ensure recovery code wasn't updated.
//     const result = await db
//         .update(users)
//         .set({ recoveryCode: encryptedNewRecoveryCode, totpKey: null })
//         .where(
//             and(
//                 eq(users.id, userId),
//                 eq(users.recoveryCode, encryptedRecoveryCode)
//             )
//         )

//     console.log({ result2FA: result });


//     return !!result[0];
// }