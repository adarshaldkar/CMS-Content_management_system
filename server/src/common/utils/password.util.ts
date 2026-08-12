import * as argon2 from 'argon2';

export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB baseline
  timeCost: 2,
  parallelism: 1,
};

// Pre-computed dummy hash to run dummy verification on non-existent users for constant timing
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$M2RvR2t3enB4Q09iV3Fraw$a99xQW8Z2f7d3O3qgKxM9x6qZ7b8Y1w5V2t3u4v5w6x';

export async function hashPassword(password: string): Promise<string> {
  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  return typeof hash === 'string' ? hash : (hash as Buffer).toString('utf-8');
}

export async function verifyPassword(hash: string, plainText: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainText);
  } catch {
    return false;
  }
}

export async function dummyVerifyPassword(plainText: string): Promise<boolean> {
  try {
    await argon2.verify(DUMMY_HASH, plainText);
  } catch {
    // Ignore dummy verification failure
  }
  return false;
}
