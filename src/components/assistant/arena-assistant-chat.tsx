"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./arena-assistant-chat.utilities";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { runArenaAssistantCommandAction } from "@/lib/actions/arena-assistant";

type ChatMessage = { id: string; role: string; content: string; createdAt: string };

export function ArenaAssistantChat({ initialMessages }: { initialMessages: ChatMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const messageList = useRef<HTMLDivElement>(null);
  useEffect(() => { const list = messageList.current; if (list) list.scrollTop = list.scrollHeight; }, [messages.length]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = value.trim();
    if (!input || isPending) return;

    const optimistic: ChatMessage = { id: `pending-${Date.now()}`, role: "USER", content: input, createdAt: new Date().toISOString() };
    setMessages((current) => [...current, optimistic]);
    setValue("");
    setError("");
    startTransition(async () => {
      try {
        const reply = await runArenaAssistantCommandAction(input);
        setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "ASSISTANT", content: reply.message, createdAt: reply.createdAt }]);
      } catch (cause) {
        setMessages((current) => current.filter((message) => message.id !== optimistic.id));
        setError(cause instanceof Error ? cause.message : "Não foi possível processar a solicitação.");
      }
    });
  }

  return <section className={viewStyles.assistant_chat} aria-label="Conversa com o Assistente da Arena">
    <div ref={messageList} className={viewStyles.assistant_chat_messages} role="log" aria-live="polite" aria-label="Mensagens do assistente">
      {messages.length ? messages.map((message) => <article className={cx(`${viewStyles.assistant_message} assistant-message-${message.role.toLowerCase()}`)} key={message.id}>
        <span>{message.role === "USER" ? "Você" : "Assistente da Arena"}</span>
        <p>{message.content}</p>
      </article>) : <div className={viewStyles.assistant_chat_empty}><strong>Olá! Sou o Assistente da Arena.</strong><span>Posso executar ações administrativas autorizadas e, futuramente, analisar os dados operacionais da arena.</span></div>}
    </div>
    <form className={viewStyles.assistant_chat_form} onSubmit={submit}>
      <label htmlFor="assistant-command">O que você precisa?</label>
      <div>
        <textarea id="assistant-command" rows={2} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Digite sua solicitação para a arena…" disabled={isPending} />
        <button className={viewStyles.button_button_primary} type="submit" disabled={isPending}>{isPending ? "Processando..." : "Enviar"}</button>
      </div>
      {error ? <p className={viewStyles.form_error} role="alert">{error}</p> : null}
    </form>
  </section>;
}
