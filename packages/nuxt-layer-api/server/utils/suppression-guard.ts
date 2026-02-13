import { suppressionRepository } from '../data/repositories';
import { computeEmailHmac } from './email-hmac';

/**
 * Assert that the given email is not in the suppression table.
 * Throws a 403 error with a generic message if the email is suppressed.
 */
export async function assertEmailNotSuppressed(email: string): Promise<void> {
  const hmac = computeEmailHmac(email);
  const suppressed = await suppressionRepository.isEmailSuppressed(hmac);

  if (suppressed) {
    throw createError({
      statusCode: 403,
      message: "This account can't be created right now. Please contact support."
    });
  }
}
