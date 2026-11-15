import { config } from "zod";

// Validation remains interpreted under CSP; do not probe Function() in the browser.
config({ jitless: true });
