import 'server-only';

// Temporary local testing mode. Never enabled in a production build.
// Set ARS_TEST_PAYMENTS=false to use Razorpay during development.
export function testPaymentsEnabled() {
  return process.env.NODE_ENV === 'development' && process.env.ARS_TEST_PAYMENTS !== 'false';
}
