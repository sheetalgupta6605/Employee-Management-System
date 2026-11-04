import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

const TICKET_STATUSES = [
  "Pending",
  "Accepted",
  "Declined",
  "In Progress",
  "Closed",
];

function HeadsetIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 14v-3a9 9 0 0 1 18 0v3" />
      <path d="M5 14h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3v-2a2 2 0 0 1 2-2Z" />
      <path d="M19 14h-2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a3 3 0 0 0 3-3v-2a2 2 0 0 0-2-2Z" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
      <path d="M20 12H9" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
    </svg>
  );
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function latestAdminResponse(ticket) {
  const history = [...(ticket.status_history || [])].reverse();
  return (
    history.find((entry) => entry.changed_by_role === "admin")?.note ||
    (ticket.status === "Declined" ? ticket.decline_reason : "") ||
    "No response yet"
  );
}

export default function EmployeeTicketSupport({ profile, showToast }) {
  const [isOpen, setIsOpen] = useState(false);
  const [section, setSection] = useState("home");
  const [phone, setPhone] = useState(profile.contact_number || "");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState("All");
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState("");
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [closingTicket, setClosingTicket] = useState(false);
  const [formError, setFormError] = useState("");
  const messageListRef = useRef(null);

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    setTicketsError("");
    try {
      const query = filter === "All" ? "" : `?status=${encodeURIComponent(filter)}`;
      const result = await api(`/tickets/my${query}`);
      setTickets(Array.isArray(result) ? result : []);
    } catch (error) {
      setTicketsError(error.message || "Could not load your tickets.");
    } finally {
      setTicketsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (section !== "tickets") return undefined;
    const timer = window.setTimeout(() => {
      void loadTickets();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [section, loadTickets]);

  async function openConversation(ticket) {
    setActiveTicket(ticket);
    setMessages([]);
    setMessagesError("");
    setSection("chat");
  }

  useEffect(() => {
    if (section !== "chat" || !activeTicket) return undefined;
    let active = true;

    async function loadMessages(initial = false) {
      if (initial) setMessagesLoading(true);
      try {
        const result = await api(
          `/tickets/${encodeURIComponent(activeTicket.ticket_id)}/messages`,
        );
        if (active) {
          setMessages(Array.isArray(result) ? result : []);
          setMessagesError("");
        }
      } catch (error) {
        if (active) setMessagesError(error.message || "Could not load messages.");
      } finally {
        if (active && initial) setMessagesLoading(false);
      }
    }

    loadMessages(true);
    const timer = window.setInterval(() => loadMessages(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [section, activeTicket]);

  useEffect(() => {
    if (section === "chat" && messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages, section]);

  async function handleRaiseTicket(event) {
    event.preventDefault();
    setFormError("");
    const cleanPhone = phone.trim();
    const cleanDescription = description.trim();
    if (!cleanPhone || !cleanDescription) {
      setFormError("Enter your phone number and describe the problem.");
      return;
    }

    setSubmitting(true);
    try {
      const ticket = await api("/tickets/", {
        method: "POST",
        body: JSON.stringify({
          phone_number: cleanPhone,
          description: cleanDescription,
        }),
      });
      setDescription("");
      setFormError("");
      showToast(`Ticket ${ticket.ticket_id} was submitted.`, "success");
      setFilter("All");
      setSection("tickets");
    } catch (error) {
      setFormError(error.message || "Ticket could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();
    if (!activeTicket || !messageDraft.trim() || sendingMessage) return;
    setSendingMessage(true);
    setMessagesError("");
    try {
      const sent = await api(
        `/tickets/${encodeURIComponent(activeTicket.ticket_id)}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ message: messageDraft.trim() }),
        },
      );
      setMessages((current) => [...current, sent]);
      setMessageDraft("");
    } catch (error) {
      setMessagesError(error.message || "Message could not be sent.");
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleCloseTicket(ticket) {
    const confirmed = window.confirm(
      `Close ticket ${ticket.ticket_id}? You will not be able to send more messages.`,
    );
    if (!confirmed) return;

    setClosingTicket(true);
    try {
      const updated = await api(
        `/tickets/${encodeURIComponent(ticket.ticket_id)}/close`,
        { method: "PATCH" },
      );
      setTickets((current) =>
        current.map((item) =>
          item.ticket_id === updated.ticket_id ? updated : item,
        ),
      );
      setActiveTicket(updated);
      showToast(`Ticket ${updated.ticket_id} is closed.`, "success");
    } catch (error) {
      showToast(error.message || "Ticket could not be closed.", "error");
    } finally {
      setClosingTicket(false);
    }
  }

  function openSection(nextSection) {
    setSection(nextSection);
    setTicketsError("");
    setFormError("");
  }

  function goBack() {
    if (section === "chat") {
      setSection("tickets");
      setActiveTicket(null);
      return;
    }
    setSection("home");
  }

  return (
    <div className="employee-support-widget">
      {isOpen && (
        <section className="employee-support-panel" aria-label="Employee Support">
          <header className="employee-support-header">
            <div className="employee-support-heading">
              {section !== "home" && (
                <button
                  type="button"
                  className="employee-support-back"
                  onClick={goBack}
                  aria-label="Go back"
                >
                  <ArrowLeftIcon />
                </button>
              )}
              <div>
                <span className="employee-support-kicker">EMPLOYEE SUPPORT</span>
                <h2>
                  {section === "home"
                    ? "How can we help?"
                    : section === "raise"
                      ? "Raise a ticket"
                      : section === "tickets"
                        ? "Track my tickets"
                        : activeTicket?.ticket_id || "Ticket conversation"}
                </h2>
              </div>
            </div>
            <button
              type="button"
              className="employee-support-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close support"
            >
              ×
            </button>
          </header>

          {section === "home" && (
            <div className="employee-support-options">
              <button
                type="button"
                className="employee-support-option"
                onClick={() => openSection("raise")}
              >
                <span className="employee-support-option-icon">+</span>
                <span>
                  <strong>Raise a Ticket</strong>
                  <small>Tell us what you need help with.</small>
                </span>
                <span className="employee-support-chevron">›</span>
              </button>
              <button
                type="button"
                className="employee-support-option"
                onClick={() => openSection("tickets")}
              >
                <span className="employee-support-option-icon">
                  <ChatIcon />
                </span>
                <span>
                  <strong>Track My Tickets</strong>
                  <small>Check status or continue a conversation.</small>
                </span>
                <span className="employee-support-chevron">›</span>
              </button>
            </div>
          )}

          {section === "raise" && (
            <form className="employee-support-form" onSubmit={handleRaiseTicket}>
              <label>
                Employee Name
                <input value={profile.name || ""} readOnly />
              </label>
              <label>
                Email
                <input type="email" value={profile.email || ""} readOnly />
              </label>
              <label>
                Phone Number
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  maxLength={50}
                  required
                  placeholder="Your best contact number"
                />
              </label>
              <label>
                Problem Description
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={5000}
                  rows={4}
                  required
                  placeholder="Describe the issue you need help with"
                />
              </label>
              {formError && <p className="employee-support-error">{formError}</p>}
              <button
                className="btn btn-primary employee-support-submit"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Ticket"}
              </button>
            </form>
          )}

          {section === "tickets" && (
            <div className="employee-support-ticket-list">
              <label className="employee-support-filter">
                Filter tickets
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  <option>All</option>
                  {TICKET_STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              {ticketsLoading ? (
                <p className="employee-support-muted">Loading tickets...</p>
              ) : ticketsError ? (
                <p className="employee-support-error">{ticketsError}</p>
              ) : tickets.length === 0 ? (
                <div className="employee-support-empty">
                  No tickets found. Raise a ticket if you need assistance.
                </div>
              ) : (
                tickets.map((ticket) => (
                  <article className="employee-ticket-card" key={ticket.ticket_id}>
                    <div className="employee-ticket-card-top">
                      <strong>{ticket.ticket_id}</strong>
                      <span className={`employee-ticket-status ${ticket.status.toLowerCase().replaceAll(" ", "-")}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="employee-ticket-description">{ticket.description}</p>
                    <dl className="employee-ticket-meta">
                      <div>
                        <dt>Date raised</dt>
                        <dd>{formatDate(ticket.created_at)}</dd>
                      </div>
                      <div>
                        <dt>Admin response</dt>
                        <dd>{latestAdminResponse(ticket)}</dd>
                      </div>
                      {ticket.decline_reason && (
                        <div>
                          <dt>Decline reason</dt>
                          <dd>{ticket.decline_reason}</dd>
                        </div>
                      )}
                    </dl>
                    <div className="employee-ticket-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => openConversation(ticket)}
                      >
                        <ChatIcon />
                        Chat
                      </button>
                      {ticket.status !== "Closed" && (
                        <button
                          type="button"
                          className="btn btn-danger"
                          disabled={closingTicket}
                          onClick={() => handleCloseTicket(ticket)}
                        >
                          {closingTicket ? "Closing..." : "Close Ticket"}
                        </button>
                      )}
                      {ticket.status === "Closed" && (
                        <span className="employee-ticket-closed">Ticket Closed</span>
                      )}
                    </div>
                  </article>
                ))
              )}
              <button
                type="button"
                className="employee-support-link"
                onClick={() => openSection("raise")}
              >
                Raise another ticket
              </button>
            </div>
          )}

          {section === "chat" && activeTicket && (
            <div className="employee-support-chat">
              <div className="employee-support-chat-summary">
                <span className={`employee-ticket-status ${activeTicket.status.toLowerCase().replaceAll(" ", "-")}`}>
                  {activeTicket.status}
                </span>
                <span>{activeTicket.description}</span>
              </div>
              <div
                className="employee-support-messages"
                ref={messageListRef}
                aria-live="polite"
              >
                {messagesLoading ? (
                  <p className="employee-support-muted">Loading conversation...</p>
                ) : messages.length === 0 ? (
                  <p className="employee-support-empty">
                    No messages yet. Send a message to start the conversation.
                  </p>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={`${message.timestamp}-${index}`}
                      className={`employee-chat-message ${message.sender_role === "employee" ? "own" : "admin"}`}
                    >
                      <span className="employee-chat-sender">{message.sender_name}</span>
                      <p>{message.message}</p>
                      <time>{formatDate(message.timestamp)}</time>
                    </div>
                  ))
                )}
              </div>
              {messagesError && (
                <p className="employee-support-error">{messagesError}</p>
              )}
              {activeTicket.status === "Closed" ? (
                <div className="employee-support-closed-note">Ticket Closed — messaging is disabled.</div>
              ) : (
                <form className="employee-support-chat-form" onSubmit={handleSendMessage}>
                  <textarea
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    maxLength={5000}
                    rows={2}
                    placeholder="Write a message..."
                    aria-label="Message"
                    required
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={sendingMessage || !messageDraft.trim()}
                  >
                    {sendingMessage ? "Sending..." : "Send"}
                  </button>
                </form>
              )}
              {activeTicket.status !== "Closed" && (
                <button
                  type="button"
                  className="employee-support-close-ticket"
                  disabled={closingTicket}
                  onClick={() => handleCloseTicket(activeTicket)}
                >
                  Close Ticket
                </button>
              )}
            </div>
          )}
        </section>
      )}

      <button
        type="button"
        className="employee-support-trigger"
        title="Employee Support"
        aria-label="Employee Support"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <HeadsetIcon />
        <span>Support</span>
      </button>
    </div>
  );
}
