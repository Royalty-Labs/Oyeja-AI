import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Bot,
  ChevronDown,
  LoaderCircle,
  MessageCircle,
  Send,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { aiChatApi, businessApi, type Business } from "../lib/api";
import "./FloatingAssistant.css";

interface FloatingAssistantProps {
  token: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const welcomeMessage =
  "Hi! I'm your OyejaAI business assistant. Ask me about your recorded finances, spending categories, or practical next steps.";

const suggestions = [
  "Summarize my business finances",
  "Where am I spending the most?",
  "What should I focus on next?",
];

export default function FloatingAssistant({ token }: FloatingAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [businessLoading, setBusinessLoading] = useState(true);
  const [businessError, setBusinessError] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: welcomeMessage },
  ]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBusiness() {
      setBusinessLoading(true);
      setBusinessError("");

      try {
        const businesses = await businessApi.list(token);
        if (!cancelled) {
          setBusiness(businesses[0] ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setBusinessError(
            error instanceof Error
              ? error.message
              : "Unable to load your business.",
          );
        }
      } finally {
        if (!cancelled) setBusinessLoading(false);
      }
    }

    void loadBusiness();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, isSending]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  async function sendMessage(text: string) {
    const content = text.trim();

    if (!content || isSending) return;

    if (!business) {
      setSendError("Create a business in Business Profile before chatting.");
      return;
    }

    const userMessage: Message = { role: "user", content };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setDraft("");
    setSendError("");
    setIsSending(true);

    try {
      const result = await aiChatApi.chat(
        business.id,
        nextMessages.slice(-12),
        token,
      );

      setMessages([
        ...nextMessages,
        { role: "assistant", content: result.answer },
      ]);
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : "The assistant could not respond. Please try again.",
      );
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  return (
    <div className="oyeja-chat-root">
      {isOpen && (
        <section
          className="oyeja-chat-panel"
          role="dialog"
          aria-label="OyejaAI business assistant"
          aria-modal="false"
        >
          <header className="oyeja-chat-header">
            <div className="oyeja-chat-brand-icon">
              <Sparkles size={21} />
            </div>
            <div className="oyeja-chat-heading">
              <strong>Ask OyejaAI</strong>
              <span>
                {businessLoading
                  ? "Loading business..."
                  : business
                    ? business.name
                    : "Business assistant"}
              </span>
            </div>
            <button
              type="button"
              className="oyeja-chat-icon-button"
              onClick={() => setIsOpen(false)}
              aria-label="Minimize assistant"
              title="Minimize"
            >
              <ChevronDown size={20} />
            </button>
            <button
              type="button"
              className="oyeja-chat-icon-button"
              onClick={() => setIsOpen(false)}
              aria-label="Close assistant"
              title="Close"
            >
              <X size={19} />
            </button>
          </header>

          <div className="oyeja-chat-messages" aria-live="polite">
            {messages.map((message, index) => (
              <div
                className={`oyeja-chat-message ${message.role === "user" ? "oyeja-chat-message-user" : "oyeja-chat-message-assistant"}`}
                key={`${index}-${message.role}`}
              >
                <span className="oyeja-chat-message-avatar">
                  {message.role === "user" ? (
                    <UserRound size={15} />
                  ) : (
                    <Bot size={16} />
                  )}
                </span>
                <div className="oyeja-chat-bubble">{message.content}</div>
              </div>
            ))}

            {isSending && (
              <div className="oyeja-chat-message oyeja-chat-message-assistant">
                <span className="oyeja-chat-message-avatar">
                  <Bot size={16} />
                </span>
                <div className="oyeja-chat-bubble oyeja-chat-thinking">
                  <LoaderCircle size={16} className="oyeja-chat-spinner" />
                  Thinking through your business data...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && !businessLoading && business && (
            <div className="oyeja-chat-suggestions">
              <span>Try asking</span>
              {suggestions.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion}
                  disabled={isSending}
                  onClick={() => void sendMessage(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {!businessLoading && !business && (
            <p className="oyeja-chat-notice">
              {businessError ||
                "Add a business in Business Profile to start asking questions."}
            </p>
          )}

          {businessError && business && (
            <p className="oyeja-chat-notice">{businessError}</p>
          )}

          {sendError && (
            <p className="oyeja-chat-error" role="alert">
              {sendError}
            </p>
          )}

          <form className="oyeja-chat-form" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  void sendMessage(draft);
                }
              }}
              placeholder={
                business ? "Ask about your business..." : "Add a business first..."
              }
              aria-label="Your message"
              rows={2}
              maxLength={2000}
              disabled={!business || businessLoading || isSending}
            />
            <button
              type="submit"
              className="oyeja-chat-send"
              disabled={!draft.trim() || !business || businessLoading || isSending}
              aria-label="Send message"
              title="Send message"
            >
              {isSending ? (
                <LoaderCircle size={18} className="oyeja-chat-spinner" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
          <p className="oyeja-chat-disclaimer">
            Answers use recorded business data and may have limitations.
          </p>
        </section>
      )}

      <button
        type="button"
        className={`oyeja-chat-launcher ${isOpen ? "oyeja-chat-launcher-open" : ""}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? "Close OyejaAI assistant" : "Open OyejaAI assistant"}
        aria-expanded={isOpen}
      >
        {isOpen ? <X size={23} /> : <MessageCircle size={23} />}
        {!isOpen && <span>Ask OyejaAI</span>}
      </button>
    </div>
  );
}
