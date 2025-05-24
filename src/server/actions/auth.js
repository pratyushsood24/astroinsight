/ astroinsight/src/server/actions/auth.js
// Wasp handles most auth actions like login, signup, logout automatically.
// This file is for custom auth-related actions if needed.
// For example, functions related to Wasp's email verification or password reset
// might be customized or extended here if the defaults are not sufficient.

// Currently, updateUserProfile and deleteUserAccount are in user.js, which is fine.
// If you had more complex auth flows, they could go here.

// Example: Resend verification email (if Wasp doesn't provide a direct action for this)
/*
import HttpError from '@wasp/core/HttpError.js';
import { generateVerificationTokenAndSendEmail } from '@wasp/auth/utils/emailVerification.js'; // Example path

export const resendVerificationEmail = async (args, context) => {
  if (!context.user || !context.user.id) {
    throw new HttpError(401, 'User not authenticated.');
  }
  if (context.user.isEmailVerified) {
    throw new HttpError(400, 'Email is already verified.');
  }

  // This is a hypothetical example; Wasp's internal structure might differ.
  // You'd typically call a Wasp-provided utility or re-implement logic.
  // await generateVerificationTokenAndSendEmail({ user: context.user, email: context.user.email });

  return { message: 'Verification email resent successfully.' };
};*/