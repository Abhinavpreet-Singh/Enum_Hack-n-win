import "dotenv/config";
import { app } from "./app.js";
import prisma from "./db/index.js";

async function main() {
    try {
        await prisma.$connect();
        console.log("Prisma connected to MongoDB successfully");

        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Port is listening on http://localhost:${port}`);
        });
    } catch (err) {
        console.error("Prisma connection failed:", err);
        process.exit(1);
    }
}

main();

// Graceful shutdown
process.on("SIGINT", async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await prisma.$disconnect();
    process.exit(0);
});
