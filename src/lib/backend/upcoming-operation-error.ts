import{FinanceOperationError}from"@/lib/finance/action-error";
export class UpcomingOperationError extends Error{}
const messages=new Set(["Imagem inválida. Envie um arquivo JPG, PNG ou WEBP válido, estático e com até 24 megapixels.","Não foi possível processar a imagem. Envie um JPG, PNG ou WEBP válido com até 24 megapixels.","Envie uma foto JPG, PNG ou WEBP.","A foto deve ter no máximo 4 MB.","Selecione a conta bancária do recebimento."]);
export function publicUpcomingError(error:unknown){if(error instanceof UpcomingOperationError||error instanceof FinanceOperationError)return error.message;const message=error&&typeof error==="object"&&"message"in error?error.message:null;return typeof message==="string"&&messages.has(message)?message:null;}
