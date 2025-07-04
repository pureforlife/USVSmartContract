import { Buffer } from 'buffer';

// Make Buffer available globally in browser
(window as any).global = window;
(window as any).Buffer = Buffer;
(window as any).process = {
  env: { DEBUG: undefined },
  version: '',
  platform: 'browser'
};

export {};
