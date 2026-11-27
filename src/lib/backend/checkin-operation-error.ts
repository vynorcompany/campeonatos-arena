import { AcademyOperationError } from "@/lib/backend/academy-operation-error";
export class CheckinOperationError extends Error {}
export function publicCheckinError(error: unknown) {
 return error instanceof CheckinOperationError || error instanceof AcademyOperationError ? error.message : null;
}
