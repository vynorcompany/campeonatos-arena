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
  const chatPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    const fit = () => {
      const panel = chatPanel.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      const scale = rect.width / panel.offsetWidth || 1;
      panel.style.setProperty("--assistant-height", `${Math.max(240, (window.innerHeight - rect.top - 20) / scale)}px`);
    };
    fit();
    window.addEventListener("resize", fit);
    const observer = new ResizeObserver(fit);
    if (chatPanel.current?.parentElement) observer.observe(chatPanel.current.parentElement);
    return () => { window.removeEventListener("resize", fit); observer.disconnect(); };
  }, []);
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

  return <section ref={chatPanel} className={viewStyles.assistant_chat} aria-label="Conversa com o Assistente da Arena">
    <div ref={messageList} className={viewStyles.assistant_chat_messages} role="log" aria-live="polite" aria-label="Mensagens do assistente">
      {messages.length ? messages.map((message) => <article className={cx(`${viewStyles.assistant_message} assistant-message-${message.role.toLowerCase()}`)} key={message.id}>
        <span>{message.role === "USER" ? "Você" : "Assistente da Arena"}</span>
        <p>{message.content}</p>
      </article>) : <div className={viewStyles.assistant_chat_empty}><strong>Olá! Sou o Assistente da Arena.</strong><span>Consulte os dados da sua arena: fluxo de caixa, inadimplência, reservas, comandas, clientes, aulas e estoque.</span></div>}
    </div>
    <form className={viewStyles.assistant_chat_form} onSubmit={submit}>
      <label htmlFor="assistant-command">O que você precisa?</label>
      <div>
        <textarea id="assistant-command" maxLength={2000} rows={2} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Ex.: Qual o fluxo de caixa de hoje? Quais clientes estão inadimplentes?" disabled={isPending} />
        <button className={viewStyles.button_button_primary} type="submit" disabled={isPending}>{isPending ? "Processando..." : "Enviar"}</button>
      </div>
      {error ? <p className={viewStyles.form_error} role="alert">{error}</p> : null}
    </form>
  </section>;
}
