import app from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

async function bootstrap() {
  try {
    await prisma.$connect();

    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error("Bootstrap error:", error);
    process.exit(1);
  }
}

bootstrap();
