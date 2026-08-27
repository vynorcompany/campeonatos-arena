"use client";

import { FormEvent, useState, useTransition } from "react";
import { runArenaAssistantCommandAction } from "@/lib/actions/arena-assistant";

type ChatMessage = { id: string; role: string; content: string; createdAt: string };

export function ArenaAssistantChat({ initialMessages }: { initialMessages: ChatMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

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

  return <section className="assistant-chat" aria-label="Conversa com o Assistente da Arena">
    <div className="assistant-chat-messages">
      {messages.length ? messages.map((message) => <article className={`assistant-message assistant-message-${message.role.toLowerCase()}`} key={message.id}>
        <span>{message.role === "USER" ? "Você" : "Assistente da Arena"}</span>
        <p>{message.content}</p>
      </article>) : <div className="assistant-chat-empty"><strong>Olá! Sou o Assistente da Arena.</strong><span>Posso executar ações administrativas autorizadas e, futuramente, analisar os dados operacionais da arena.</span></div>}
    </div>
    <form className="assistant-chat-form" onSubmit={submit}>
      <label htmlFor="assistant-command">O que você precisa?</label>
      <div>
        <input id="assistant-command" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Ex.: Crie uma fatura no valor de 560,00 para o cliente Alexandre com a data de hoje." disabled={isPending} />
        <button className="button button-primary" type="submit" disabled={isPending}>{isPending ? "Processando..." : "Enviar"}</button>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </form>
  </section>;
}
