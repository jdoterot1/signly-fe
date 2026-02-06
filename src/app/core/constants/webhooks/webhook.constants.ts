export const WEBHOOK_EVENT_OPTIONS = [
  'document.created',
  'document.completed',
  'document.canceled',
  'signer.invited',
  'signer.signed'
];

export const WEBHOOK_BACKOFF_OPTIONS = ['exponential', 'linear', 'fixed'];
