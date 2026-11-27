/** Deliberate, user-facing financial failure. Infrastructure errors stay private. */
export class FinanceOperationError extends Error { constructor(message: string, readonly status = 400) { super(message); } }
