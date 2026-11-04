export function safeReviewError(error: string) {
  if (/sign in/i.test(error)) return "Please sign in to start your review.";
  if (/payment|entitlement/i.test(error)) return "Complete your review payment, then try again.";
  if (/save|storage/i.test(error)) return "We couldn’t save your changes. Retry saving before continuing.";
  return "The review connection was interrupted. Try sending your message again.";
}
