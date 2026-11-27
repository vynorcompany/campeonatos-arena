"use server";
import {runPublicRegistration} from "@/lib/portal/registration-mutation";
import type {PublicRegistrationState} from "@/lib/backend/contracts/public-registration";
export async function createPublicRegistrationAction(_:PublicRegistrationState,form:FormData):Promise<PublicRegistrationState>{return runPublicRegistration(form);}
