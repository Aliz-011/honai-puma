import { Hono } from "hono";

import { db } from "@/db";

const app = new Hono()
    .get('/', async c => {
        const data = await db.query.regionals.findMany({
            with: {
                branches: {
                    with: {
                        subbranches: {
                            with: {
                                clusters: {
                                    with: {
                                        kabupatens: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        return c.json(data, 200)
    })
    .get('/fmc-areas', async c => {
        const data = await db.query.regionals.findMany({
            with: {
                branches: {
                    with: {
                        woks: {
                            with: {
                                stos: true
                            }
                        }
                    }
                }
            }
        })

        return c.json(data, 200)
    })

export default app