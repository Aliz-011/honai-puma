import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { headers } from "next/headers";
import { z } from "zod";

import { deleteSessionTokenCookie, setSessionTokenCookie } from "@/lib/cookies";
import { verifyPasswordHash } from "@/lib/password";
import { RefillingTokenBucket, Throttler } from "@/lib/rate-limit";
import { globalPOSTRateLimit } from "@/lib/request";
import { createSession, generateSessionToken, getCurrentSession, invalidateSession } from "@/lib/sessions";
import { checkEmailAvailability, createUser, getUserFromUsername, getUserPasswordHash } from "@/lib/user";
import { zValidator } from "@/lib/validator-wrapper";

const throttler = new Throttler<string>([1, 2, 4, 8, 16, 30, 60, 180, 300]);
const ipBucket = new RefillingTokenBucket<string>(20, 1);

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

            const sessionToken = generateSessionToken()
            const session = await createSession(sessionToken, user.id)

            await setSessionTokenCookie(sessionToken, session.expiresAt)

            return c.json({ error: null }, 200)
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

            const sessionToken = generateSessionToken()
            const session = await createSession(sessionToken, user.id)
            await setSessionTokenCookie(sessionToken, session.expiresAt)

            return c.json({ error: null }, 200)
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