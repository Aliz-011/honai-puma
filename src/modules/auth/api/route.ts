import { decodeBase64 } from "@oslojs/encoding";
import { Hono } from "hono";
import { verifyTOTP } from '@oslojs/otp';
import { HTTPException } from "hono/http-exception";
import { headers } from "next/headers";
import { z } from "zod";

import { deleteSessionTokenCookie, setSessionTokenCookie } from "@/lib/cookies";
import { verifyPasswordHash } from "@/lib/password";
import { RefillingTokenBucket, Throttler } from "@/lib/rate-limit";
import { globalPOSTRateLimit } from "@/lib/request";
import { createSession, generateSessionToken, getCurrentSession, invalidateSession, SessionFlags, setSessionAs2FAVerified } from "@/lib/sessions";
import { checkEmailAvailability, createUser, getUserFromUsername, getUserPasswordHash, getUserTOTPKey, setUserAsEmailVerifiedIfEmailMatches, updateUserTOTPKey } from "@/lib/user";
import { zValidator } from "@/lib/validator-wrapper";
import { totpBucket } from "@/lib/2fa";

const throttler = new Throttler<string>([1, 2, 4, 8, 16, 30, 60, 180, 300]);
const ipBucket = new RefillingTokenBucket<string>(20, 1);
const totpUpdateBucket = new RefillingTokenBucket<string>(3, 60 * 10);

const app = new Hono()
    .get('/current', async c => {
        const { session, user } = await getCurrentSession()

        if (!session) {
            throw new HTTPException(401, { res: c.json({ error: 'Unauthorized' }) });
        }

        return c.json({ data: user }, 200)
    })
    .post('/login', zValidator("json", z.object({ username: z.string(), password: z.string().trim().min(1) })),
        async c => {
            if (!(await globalPOSTRateLimit())) {
                throw new HTTPException(429, { res: c.json({ error: 'Too many request' }) });
            }

            const clientIP = (await headers()).get('X-Forwarded-For');
            if (clientIP !== null && !ipBucket.check(clientIP, 1)) {
                throw new HTTPException(429, { res: c.json({ error: 'Too many request' }) });
            }

            const { username, password } = c.req.valid('json')

            if (username === '' || password === '') {
                throw new HTTPException(400, { res: c.json({ error: 'Please enter your username, and password' }) });
            }

            const user = await getUserFromUsername(username)

            if (!user) {
                throw new HTTPException(400, { res: c.json({ error: "Account not found" }) })
            }

            if (clientIP !== null && !ipBucket.consume(clientIP, 1)) {
                throw new HTTPException(429, { res: c.json({ error: 'Too many request' }) });
            }

            if (!throttler.consume(user.id)) {
                throw new HTTPException(429, { res: c.json({ error: 'Too many request' }) });
            }

            const hashedPassword = await getUserPasswordHash(user.id)
            const validPassword = await verifyPasswordHash(hashedPassword, password)

            if (!validPassword) {
                throw new HTTPException(400, { res: c.json({ error: 'Invalid email or password' }) });
            }

            throttler.reset(user.id)

            const sessionFlags: SessionFlags = {
                twoFactorVerified: false
            }

            const sessionToken = generateSessionToken()
            const session = await createSession(sessionToken, user.id, sessionFlags)

            await setSessionTokenCookie(sessionToken, session.expiresAt)
            await setUserAsEmailVerifiedIfEmailMatches(session.userId, user.email)

            if (!user.registered2FA) {
                return c.json({ error: 'Please set up 2FA', redirectUrl: '/2fa/setup' })
            }

            if (!session.twoFactorVerified) {
                return c.json({ error: 'Please complete 2FA verification', redirectUrl: '/2fa' })
            }

            return c.json({ error: null, redirectUrl: '/' }, 200)
        })
    .post('/register',
        zValidator('json', z.object({ email: z.string().email().trim(), username: z.string().min(3).trim(), password: z.string().min(6).trim() })),
        async c => {
            if (!(await globalPOSTRateLimit())) {
                throw new HTTPException(429, { res: c.json({ error: 'Too many request' }) });
            }

            const clientIP = (await headers()).get('X-Forwarded-For');
            if (clientIP !== null && !ipBucket.check(clientIP, 1)) {
                throw new HTTPException(429, { res: c.json({ error: 'Too many request' }) });
            }

            const { email, password, username } = c.req.valid('json')

            const emailAvailability = await checkEmailAvailability(email)
            if (!emailAvailability) {
                throw new HTTPException(400, { res: c.json({ error: 'Email already in used' }) })
            }

            if (clientIP !== null && !ipBucket.consume(clientIP, 1)) {
                throw new HTTPException(429, { res: c.json({ error: 'Too many request' }) });
            }

            const user = await createUser(email, username, password)
            console.log(user);

            const sessionFlags: SessionFlags = {
                twoFactorVerified: false
            }

            const sessionToken = generateSessionToken()
            const session = await createSession(sessionToken, user.id, sessionFlags)
            await setSessionTokenCookie(sessionToken, session.expiresAt)
            await setUserAsEmailVerifiedIfEmailMatches(session.userId, user.email)

            return c.json({ error: null }, 200)
        })
    .post('/2fa-setup', zValidator('json', z.object({ code: z.string(), key: z.string() })),
        async c => {
            if (!(await globalPOSTRateLimit())) {
                throw new HTTPException(429, { res: c.json({ error: 'Too many request' }) });
            }

            const { session, user } = await getCurrentSession()

            if (!session) {
                throw new HTTPException(401, { res: c.json({ error: 'Unauthorized' }) });
            }

            if (user.registered2FA && !session.twoFactorVerified) {
                throw new HTTPException(403, { res: c.json({ error: 'Forbidden' }) });
            }

            if (!totpUpdateBucket.check(user.id, 1)) {
                throw new HTTPException(429, { res: c.json({ error: 'Too many request' }) });
            }

            const { code, key: encodedKey } = c.req.valid('json')

            if (encodedKey.length !== 28) {
                throw new HTTPException(400, { res: c.json({ error: 'Please enter your code' }) });
            }

            let key: Uint8Array;

            try {
                key = decodeBase64(encodedKey);
            } catch {
                throw new HTTPException(400, { res: c.json({ error: 'Invalid key' }) });

            }

            if (key.byteLength !== 20) {
                throw new HTTPException(400, { res: c.json({ error: 'Invalid key' }) });
            }

            if (!totpUpdateBucket.check(user.id, 1)) {
                throw new HTTPException(429, { res: c.json({ error: 'Too many request' }) });
            }

            if (!verifyTOTP(key, 30, 6, code)) {
                throw new HTTPException(400, { res: c.json({ error: 'Invalid code' }) });
            }

            await updateUserTOTPKey(user.id, key)
            await setSessionAs2FAVerified(session.id)

            return c.json(null, 200)
        })
    .post('/2fa', zValidator('json', z.object({ code: z.string() })),
        async c => {
            if (!(await globalPOSTRateLimit())) {
                throw new HTTPException(429, { res: c.json({ error: 'Too many request' }) });
            }

            const { session, user } = await getCurrentSession()

            if (!session) {
                throw new HTTPException(401, { res: c.json({ error: 'Unauthorized' }) });
            }

            if (
                !user.registered2FA ||
                session.twoFactorVerified ||
                !user.emailVerified
            ) {
                throw new HTTPException(403, { res: c.json({ error: 'Forbidden' }) });
            }

            if (!totpUpdateBucket.check(user.id, 1)) {
                throw new HTTPException(429, { res: c.json({ error: 'Too many request' }) });
            }

            const { code } = c.req.valid('json')

            if (!totpUpdateBucket.consume(user.id, 1)) {
                throw new HTTPException(429, { res: c.json({ error: 'Too many request' }) });
            }

            const totpKey = await getUserTOTPKey(user.id)

            if (totpKey === null) {
                throw new HTTPException(404, { res: c.json({ error: 'TOTP Key not found' }) });
            }

            if (!verifyTOTP(totpKey, 30, 6, code)) {
                throw new HTTPException(400, { res: c.json({ error: 'Invalid code' }) });
            }

            totpBucket.reset(user.id);
            await setSessionAs2FAVerified(session.id);

            return c.json(null, 200)
        })
    .post('/logout',
        async c => {
            if (!(await globalPOSTRateLimit())) {
                throw new HTTPException(429, { res: c.json({ error: 'Too many request' }) });
            }

            const { session } = await getCurrentSession()

            if (!session) {
                throw new HTTPException(401, { res: c.json({ error: 'Unauthorized' }) });
            }

            await invalidateSession(session.id)
            await deleteSessionTokenCookie()

            return c.json({ error: null }, 200)
        }
    )

export default app