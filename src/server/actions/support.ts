"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "../auth/session";
import { openTicket, replyTicket, updateTicket } from "../services/support";
import { bool, run, str } from "./run";

export async function openTicketAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser();
    const id = await openTicket(actor, {
      category: str(form, "category") as "question",
      subject: str(form, "subject"),
      body: str(form, "body"),
      requestId: str(form, "requestId") || undefined,
    });
    redirect(`/suporte/${id}?novo=1`);
  });
}

export async function replyTicketAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor, user } = await requireUser();
    const id = str(form, "ticketId");
    await replyTicket(actor, id, str(form, "body"), bool(form, "internal"));
    redirect(user.role === "admin" ? `/admin/suporte/${id}` : `/suporte/${id}`);
  });
}

export async function updateTicketAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser(["admin"]);
    const id = str(form, "ticketId");
    await updateTicket(actor, id, {
      status: (str(form, "status") || undefined) as never,
      priority: (str(form, "priority") || undefined) as never,
      assignToMe: bool(form, "assignToMe"),
    });
    redirect(`/admin/suporte/${id}`);
  });
}
