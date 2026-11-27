"use server";
import { runClientMutation } from '@/lib/clients/mutation';
import { getClientLoyalty } from '@/lib/clients/loyalty';
export async function updateClientLoyaltySettingsAction(form: FormData) { await runClientMutation('loyalty-settings', form); }
export async function getClientLoyaltyAction(playerId: string) { return getClientLoyalty(playerId); }
export async function recordClientVisitAction(form: FormData) { await runClientMutation('loyalty-visit', form); }
export async function redeemClientLoyaltyAction(form: FormData) { await runClientMutation('loyalty-redeem', form); }
export async function fulfillClientLoyaltyRewardAction(form: FormData) { await runClientMutation('loyalty-fulfill', form); }
