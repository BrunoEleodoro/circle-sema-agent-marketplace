import type { ParsedListingInput } from './schema';

const BANNED_POLICY_FLAGS = new Set([
  'raw-contact-sales',
  'undisclosed-engagement',
  'secrets',
  'private-keys',
  'credentials',
  'third-party-pii',
  'private-messages',
]);

const SENSITIVE_TERMS = [
  'raw contact',
  'contact list',
  'telegram contacts',
  'phone numbers',
  'private key',
  'seed phrase',
  'api key',
  'password',
  'undisclosed retweet',
  'fake engagement',
  'bot engagement',
];

export function validateListingPolicy(input: ParsedListingInput): string[] {
  const errors: string[] = [];
  for (const flag of input.policyFlags) {
    if (BANNED_POLICY_FLAGS.has(flag)) {
      errors.push(`Policy flag "${flag}" is not allowed for marketplace listings.`);
    }
  }

  const searchable = `${input.title}\n${input.description}\n${input.proofSummary}`.toLowerCase();
  for (const term of SENSITIVE_TERMS) {
    if (searchable.includes(term)) {
      errors.push(`Listing text appears to include prohibited material: "${term}".`);
    }
  }

  if (input.listingType === 'warm_intro' && input.deliveryMode !== 'intro_service') {
    errors.push('Warm intro listings must use deliveryMode "intro_service".');
  }

  if (input.listingType === 'sponsored_distribution' && !input.policyFlags.includes('disclosure-required')) {
    errors.push('Sponsored distribution listings must include policy flag "disclosure-required".');
  }

  return errors;
}

export function assertListingPolicy(input: ParsedListingInput): void {
  const errors = validateListingPolicy(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }
}
