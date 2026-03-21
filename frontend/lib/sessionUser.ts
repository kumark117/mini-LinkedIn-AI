import { prisma } from '@/lib/db';

/** False when the DB was reset but the browser still has a JWT with an old user id. */
export async function isUserIdInDatabase(userId: number): Promise<boolean> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });
  return row != null;
}
