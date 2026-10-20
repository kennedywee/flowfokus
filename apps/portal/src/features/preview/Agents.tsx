import { useRef, useState, type FormEvent } from "react";
import { ArrowUp, Bot, Check, MessageSquare, Plus, Sparkles } from "lucide-react";
import { Avatar, Pill, buttonClass } from "../../components/ui";
import { sampleMembers } from "./data";
import { PreviewPage } from "./shared";

const prompts = ["Who hasn’t visited in two weeks?", "What needs attention today?", "Summarize this week’s sales"];
type Message = { id: number; role: "user" | "agent"; text: string; members?: boolean };
function answer(question: string): Omit<Message, "id" | "role"> {
  if (/visit|inactive|come in|week.*away/i.test(question))
    return {
      text: "In the sample records, Hui Lin Ong and Arjun Rao have not visited since early October. Arjun also has RM 180.00 outstanding. Here’s a short follow-up list.",
      members: true,
    };
  if (/sale|revenue|payment/i.test(question))
    return {
      text: "The sample report shows RM 6,200.00 in membership sales across the last four weeks. Monthly memberships account for most sales. Open Reports for the weekly breakdown.",
    };
  if (/send|message|email|remind/i.test(question))
    return {
      text: "Here’s a draft you can use: “Hi! We haven’t seen you at the gym lately. Let us know if you need help getting back into your routine.” This preview does not send messages.",
    };
  return {
    text: "Your sample desk has two membership follow-ups and one denied check-in to review. Start with the Inbox, then check today’s visits. This is a prepared preview response; no live records were searched.",
  };
}

export function Agents() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  function send(text: string) {
    if (!text.trim()) return;
    setMessages((items) => [
      ...items,
      { id: items.length, role: "user", text: text.trim() },
      { id: items.length + 1, role: "agent", ...answer(text) },
    ]);
    setInput("");
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    });
  }
  function onSubmit(event: FormEvent) {
    event.preventDefault();
    send(input);
  }
  return (
    <PreviewPage
      title="Agents"
      description="A second pair of eyes for your front desk."
      actions={
        <button
          type="button"
          className={buttonClass({ variant: "secondary", size: "small" })}
          onClick={() => {
            setMessages([]);
            setInput("");
            inputRef.current?.focus();
          }}
        >
          <Plus aria-hidden="true" />
          New conversation
        </button>
      }
    >
      <div className="preview-agent-layout">
        <aside className="preview-agent-aside">
          <div className="preview-agent-identity">
            <span className="preview-agent-icon">
              <Bot aria-hidden="true" />
            </span>
            <div>
              <h2>Desk assistant</h2>
              <Pill tone="info">Preview</Pill>
            </div>
          </div>
          <p>Find the next task, review a member, or put a question to your records.</p>
          <div className="preview-agent-capabilities">
            <span>
              <Check aria-hidden="true" />
              Membership follow-ups
            </span>
            <span>
              <Check aria-hidden="true" />
              Desk summaries
            </span>
            <span>
              <Check aria-hidden="true" />
              Message drafts
            </span>
          </div>
          <div className="preview-agent-disclosure">
            <Sparkles aria-hidden="true" />
            <p>Prepared replies using sample data. Nothing is sent or changed.</p>
          </div>
        </aside>
        <section className="preview-chat" aria-label="Desk assistant conversation">
          <div className="preview-chat__messages" ref={listRef} role="log" aria-label="Messages" aria-live="polite">
            {!messages.length ? (
              <div className="preview-chat__welcome">
                <MessageSquare aria-hidden="true" />
                <h2>What can we clear off your desk?</h2>
                <p>Start with a question. We’ll make the next step clear.</p>
                <div className="preview-prompts">
                  {prompts.map((prompt) => (
                    <button type="button" key={prompt} onClick={() => send(prompt)}>
                      {prompt}
                      <ArrowUp aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="preview-chat__message" data-role={message.role}>
                  {message.role === "agent" ? <Bot className="preview-chat__avatar" aria-hidden="true" /> : null}
                  <div>
                    <span className="visually-hidden">{message.role === "agent" ? "Assistant: " : "You: "}</span>
                    <p>{message.text}</p>
                    {message.members ? (
                      <div className="preview-chat__results">
                        {sampleMembers.slice(1, 3).map((member) => (
                          <div key={member.id}>
                            <Avatar name={member.name} size={26} />
                            <strong>{member.name}</strong>
                            <span>Last visit {member.lastVisit}</span>
                            <Pill tone={member.balance ? "warning" : "good"}>
                              {member.balance ? "RM 180 due" : "Paid"}
                            </Pill>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
          <form className="preview-composer" onSubmit={onSubmit}>
            <label htmlFor="agent-question" className="visually-hidden">
              Ask the desk assistant
            </label>
            <textarea
              id="agent-question"
              ref={inputRef}
              rows={2}
              maxLength={1000}
              placeholder="Ask about your gym…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(input);
                }
              }}
            />
            <div>
              <span>Desk assistant · Sample data</span>
              <button type="submit" className={buttonClass()} disabled={!input.trim()} aria-label="Send question">
                <ArrowUp aria-hidden="true" />
              </button>
            </div>
          </form>
        </section>
      </div>
    </PreviewPage>
  );
}
