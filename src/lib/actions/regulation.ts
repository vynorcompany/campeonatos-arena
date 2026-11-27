"use server";
import { runRegulationMutation } from '@/lib/regulation/mutation';
import type { RegulationActionState } from '@/lib/backend/contracts/regulation';
export type { RegulationActionState } from '@/lib/backend/contracts/regulation';
export async function createRegulationDocumentAction(_:RegulationActionState,form:FormData):Promise<RegulationActionState>{return runRegulationMutation('create',form);}
export async function acceptRegulationDocumentAction(_:RegulationActionState,form:FormData):Promise<RegulationActionState>{return runRegulationMutation('accept',form);}
