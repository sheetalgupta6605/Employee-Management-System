import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";

const STATUSES = ["Pending", "Accepted", "Declined", "In Progress", "Closed"];

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

function statusClass(status = "") {
  return status.toLowerCase().replaceAll(" ", "-");
}

function historyEventName(status) {
  return status === "Pending" ? "Ticket created" : status;
}

function historyActor(ticket, entry) {
  const fieldByStatus = {
    Pending: "employee_name",
    Accepted: "accepted_by_name",
    Declined: "declined_by_name",
    "In Progress": "in_progress_by_name",
    Closed: "closed_by_name",
  };
  const actor = ticket[fieldByStatus[entry.status]] || entry.changed_by_name;
  if (actor) return actor;

  const noteActor = entry.note?.match(/\bby\s+(.+)$/i)?.[1];
  if (noteActor) return noteActor;
  return entry.changed_by_role === "admin" ? "Admin" : ticket.employee_name;
}

export default function AdminTicketManagement({ active, showToast }) {
  const [tickets, setTickets] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [filter, setFilter] = useState("All Tickets");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [working, setWorking] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [declineReason, setDeclineReason] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [watchedNotificationIds, setWatchedNotificationIds] = useState([]);
  const [notificationError, setNotificationError] = useState("");
  const [notificationTicket, setNotificationTicket] = useState(null);
  const [detailError, setDetailError] = useState("");
  const messageListRef = useRef(null);
  const selectedTicketId = selectedTicket?.ticket_id;

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams();
      if (filter !== "All Tickets") params.set("status", filter);
      if (search.trim()) params.set("search", search.trim());
      const query = params.toString();
      const [result, allResult] = await Promise.all([
        api(`/admin/tickets${query ? `?${query}` : ""}`),
        api("/admin/tickets"),
      ]);
      setTickets(Array.isArray(result) ? result : []);
      setAllTickets(Array.isArray(allResult) ? allResult : []);
    } catch (error) {
      setLoadError(error.message || "Could not load tickets.");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setTimeout(() => void loadTickets(), 0);
    return () => window.clearTimeout(timer);
  }, [active, loadTickets]);

  const loadNotifications = useCallback(async () => {
    try {
      const result = await api("/admin/ticket-notifications");
      setNotifications(Array.isArray(result) ? result : []);
      setNotificationError("");
    } catch (error) {
      setNotificationError(error.message || "Notifications are unavailable.");
    }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void loadNotifications(), 0);
    const timer = window.setInterval(() => void loadNotifications(), 7000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!selectedTicketId) return undefined;
    let activeEffect = true;
    const ticketId = selectedTicketId;

    async function refreshDetails() {
      try {
        const detail = await api(`/admin/tickets/${encodeURIComponent(ticketId)}`);
        if (activeEffect) {
          setSelectedTicket(detail);
          setDetailError("");
        }
      } catch (error) {
        if (activeEffect) setDetailError(error.message || "Ticket details could not refresh.");
      }
    }

    async function refreshMessages() {
      try {
        const result = await api(
          `/admin/tickets/${encodeURIComponent(ticketId)}/messages`,
        );
        if (activeEffect) setMessages(Array.isArray(result) ? result : []);
      } catch (error) {
        if (activeEffect) {
          showToast(error.message || "Could not load ticket messages.", "error");
        }
      }
    }

    void refreshDetails();
    void refreshMessages();
    const timer = window.setInterval(() => {
      void refreshDetails();
      void refreshMessages();
    }, 7000);
    return () => {
      activeEffect = false;
      window.clearInterval(timer);
    };
  }, [selectedTicketId, showToast]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  const ticketRaisedNotifications = useMemo(
    () =>
      notifications.filter(
        (notification) => notification.title === "New employee ticket",
      ),
    [notifications],
  );
  const popupNotification = useMemo(
    () =>
      ticketRaisedNotifications.find(
        (notification) =>
          !notification.is_read &&
          !watchedNotificationIds.includes(notification.notification_id),
      ),
    [ticketRaisedNotifications, watchedNotificationIds],
  );
  const popupTicket =
    notificationTicket?.ticket_id === popupNotification?.ticket_id
      ? notificationTicket
      : null;

  const counts = useMemo(
    () => ({
      Total: allTickets.length,
      Pending: allTickets.filter((ticket) => ticket.status === "Pending").length,
      "In Progress": allTickets.filter((ticket) => ticket.status === "In Progress").length,
      Closed: allTickets.filter((ticket) => ticket.status === "Closed").length,
    }),
    [allTickets],
  );

  function watchNotificationLater(notification) {
    setWatchedNotificationIds((current) =>
      current.includes(notification.notification_id)
        ? current
        : [...current, notification.notification_id],
    );
  }

  function openTicket(ticket) {
    setMessages([]);
    setMessageDraft("");
    setDetailError("");
    setSelectedTicket(ticket);
  }

  function closeTicketDetails() {
    setPendingAction(null);
    setSelectedTicket(null);
  }

  async function viewNotification(notification) {
    try {
      const ticket = await api(
        `/admin/tickets/${encodeURIComponent(notification.ticket_id)}`,
      );
      openTicket(ticket);
      watchNotificationLater(notification);
    } catch (error) {
      showToast(error.message || "Could not open ticket.", "error");
    }
  }

  async function changeStatus(ticket, status, reason = "") {
    setWorking(true);
    try {
      let updated;
      if (status === "Accepted") {
        updated = await api(
          `/admin/tickets/${encodeURIComponent(ticket.ticket_id)}/accept`,
          { method: "PATCH" },
        );
      } else if (status === "Declined") {
        updated = await api(
          `/admin/tickets/${encodeURIComponent(ticket.ticket_id)}/decline`,
          {
            method: "PATCH",
            body: JSON.stringify({ reason }),
          },
        );
      } else {
        updated = await api(
          `/admin/tickets/${encodeURIComponent(ticket.ticket_id)}/status`,
          {
            method: "PATCH",
            body: JSON.stringify({ status }),
          },
        );
      }
      setSelectedTicket(updated);
      setTickets((current) =>
        current.map((item) =>
          item.ticket_id === updated.ticket_id ? updated : item,
        ),
      );
      await Promise.all([loadTickets(), loadNotifications()]);
      showToast(`Ticket ${updated.ticket_id} updated to ${updated.status}.`, "success");
      return true;
    } catch (error) {
      showToast(error.message || "Ticket could not be updated.", "error");
      return false;
    } finally {
      setWorking(false);
    }
  }

  async function confirmTicketAction(event) {
    event.preventDefault();
    if (!selectedTicket || !pendingAction) return;
    if (pendingAction.status === "Declined" && !declineReason.trim()) {
      showToast("A decline reason is required.", "error");
      return;
    }

    const updated = await changeStatus(
      selectedTicket,
      pendingAction.status,
      declineReason.trim(),
    );
    if (updated) {
      setPendingAction(null);
      setDeclineReason("");
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();
    if (!selectedTicket || !messageDraft.trim() || sending) return;
    setSending(true);
    try {
      const message = await api(
        `/admin/tickets/${encodeURIComponent(selectedTicket.ticket_id)}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ message: messageDraft.trim() }),
        },
      );
      setMessages((current) => [...current, message]);
      setMessageDraft("");
      await loadNotifications();
    } catch (error) {
      showToast(error.message || "Message could not be sent.", "error");
    } finally {
      setSending(false);
    }
  }

  const newestNotificationId = popupNotification?.ticket_id;
  useEffect(() => {
    if (!newestNotificationId) return undefined;
    let activeEffect = true;
    api(`/admin/tickets/${encodeURIComponent(newestNotificationId)}`)
      .then((ticket) => {
        if (activeEffect) setNotificationTicket(ticket);
      })
      .catch((error) => {
        if (activeEffect) {
          setNotificationTicket(null);
          setNotificationError(error.message || "Ticket notification details are unavailable.");
        }
      });
    return () => {
      activeEffect = false;
    };
  }, [newestNotificationId]);

  return (
    <>
      {active && (
        <section className="panel-card admin-ticket-management">
          <div className="panel-card-header">
            <div className="panel-title-group admin-ticket-page-header">
              <h2>Ticket Management</h2>
              <p>Review requests, coordinate with employees, and track progress.</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={loadTickets}>
              Refresh tickets
            </button>
          </div>
          <div className="admin-ticket-statistics" aria-label="Ticket summary">
            {Object.entries(counts).map(([label, count]) => (
              <div className="admin-ticket-stat" key={label}>
                <span>{label}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
          <div className="admin-ticket-toolbar">
            <label className="admin-ticket-status-filter">
              <span className="sr-only">Filter by status</span>
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option>All Tickets</option>
                {STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <label className="admin-ticket-search">
              <span>Search tickets</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employee or ticket ID"
                aria-label="Search employee name, email, or ticket ID"
              />
            </label>
          </div>
          {notificationError && (
            <p className="admin-ticket-inline-error" role="status">{notificationError}</p>
          )}
          {ticketRaisedNotifications.length > 0 && (
            <details className="admin-ticket-notification-list">
              <summary className="admin-ticket-notification-list-heading">
                <span className="admin-ticket-notification-list-title">New ticket notifications</span>
                <span className="admin-ticket-notification-count">{ticketRaisedNotifications.length}</span>
              </summary>
              <p className="admin-ticket-notification-help">
                Notifications remain available here when you choose Watch Later.
              </p>
              {ticketRaisedNotifications.map((notification) => {
                const ticket = allTickets.find(
                  (item) => item.ticket_id === notification.ticket_id,
                );
                const employeeName =
                  ticket?.employee_name ||
                  (notificationTicket?.ticket_id === notification.ticket_id
                    ? notificationTicket.employee_name
                    : null);
                return (
                  <article className="admin-ticket-notification-row" key={notification.notification_id}>
                    <div>
                      <strong>{employeeName || "Employee"} — {notification.ticket_id}</strong>
                      <p>{ticket?.description || notification.message}</p>
                      <time dateTime={notification.created_at}>{formatDate(notification.created_at)}</time>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void viewNotification(notification)}
                    >
                      View Ticket
                    </button>
                  </article>
                );
              })}
            </details>
          )}

          {loadError ? (
            <div className="table-empty-state">
              <p className="subtext">{loadError}</p>
              <button type="button" className="btn btn-secondary" onClick={loadTickets}>Try again</button>
            </div>
          ) : loading ? (
            <div className="table-empty-state"><p className="subtext">Loading tickets...</p></div>
          ) : tickets.length === 0 ? (
            <div className="admin-ticket-empty-state">
              <strong>{search || filter !== "All Tickets" ? "No matching tickets" : "No tickets yet"}</strong>
              <p>{search || filter !== "All Tickets"
                ? "Try changing the search or status filter."
                : "New employee support requests will appear here."}</p>
            </div>
          ) : (
            <div className="table-responsive-wrapper">
              <table className="ems-table admin-ticket-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Employee</th>
                    <th>Description</th>
                    <th>Date Raised</th>
                    <th>Status</th>
                    <th><span className="sr-only">Action</span></th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.ticket_id}>
                      <td><strong className="admin-ticket-id">{ticket.ticket_id}</strong></td>
                      <td className="admin-ticket-employee-cell">{ticket.employee_name}</td>
                      <td title={ticket.description}>
                        <span className="admin-ticket-description-cell">{ticket.description}</span>
                      </td>
                      <td>{formatDate(ticket.created_at)}</td>
                      <td><span className={`admin-ticket-status ${statusClass(ticket.status)}`}>{ticket.status}</span></td>
                      <td>
                        <button
                          type="button"
                          className="admin-ticket-view-button"
                          onClick={() => openTicket(ticket)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pendingAction && selectedTicket && (
            <div
              className="modal-backdrop admin-ticket-action-backdrop"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !working) {
                  setPendingAction(null);
                }
              }}
            >
              <form
                className="modal-card admin-ticket-action-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-ticket-action-title"
                onSubmit={confirmTicketAction}
              >
                <div className="modal-header">
                  <div>
                    <p className="page-eyebrow">CONFIRM ACTION</p>
                    <h3 id="admin-ticket-action-title">
                      {pendingAction.status === "Accepted" ? "Accept this ticket?" : "Decline this ticket?"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="btn-icon"
                    disabled={working}
                    onClick={() => setPendingAction(null)}
                    aria-label="Close confirmation"
                  >
                    ×
                  </button>
                </div>
                <div className="admin-ticket-action-content">
                  <p>
                    {pendingAction.status === "Accepted"
                      ? `This will accept ticket ${selectedTicket.ticket_id} and notify the employee.`
                      : `This will decline ticket ${selectedTicket.ticket_id} and notify the employee.`}
                  </p>
                  {pendingAction.status === "Declined" && (
                    <label className="admin-ticket-decline-field">
                      <span>Reason for declining</span>
                      <textarea
                        value={declineReason}
                        onChange={(event) => setDeclineReason(event.target.value)}
                        rows={4}
                        maxLength={1000}
                        required
                        autoFocus
                      />
                    </label>
                  )}
                  <div className="admin-ticket-confirm-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={working}
                      onClick={() => setPendingAction(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={pendingAction.status === "Declined" ? "btn btn-danger" : "btn btn-primary"}
                      disabled={working || (pendingAction.status === "Declined" && !declineReason.trim())}
                    >
                      {working
                        ? "Saving..."
                        : pendingAction.status === "Accepted"
                          ? "Confirm acceptance"
                          : "Confirm decline"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

        </section>
      )}

      {popupNotification && (
        <aside className="admin-ticket-notification-widget" aria-live="polite">
          <article className="admin-ticket-toast">
            <button
              type="button"
              className="admin-ticket-toast-main"
              aria-label={`View ticket ${popupNotification.ticket_id} from ${popupTicket?.employee_name || "employee"}`}
              onClick={() => void viewNotification(popupNotification)}
            >
              <span className="admin-ticket-toast-heading">
                <strong>New employee ticket</strong>
                <span className="admin-ticket-unread-dot" aria-label="Unread" />
              </span>
              <span className="admin-ticket-toast-employee">
                {popupTicket?.employee_name || "Employee"}
              </span>
              <span className="admin-ticket-toast-id">
                Ticket {popupNotification.ticket_id}
              </span>
              <span className="admin-ticket-toast-description">
                {popupTicket?.description || popupNotification.message}
              </span>
            </button>
            <div className="admin-ticket-toast-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void viewNotification(popupNotification)}
              >
                View Ticket
              </button>
              <button
                type="button"
                className="admin-ticket-watch-later"
                onClick={() => watchNotificationLater(popupNotification)}
              >
                Watch Later
              </button>
            </div>
          </article>
        </aside>
      )}

      {selectedTicket && (
        <div
          className="modal-backdrop admin-ticket-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeTicketDetails();
          }}
        >
          <section
            className="modal-card admin-ticket-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-ticket-detail-title"
          >
            <div className="modal-header">
              <div>
                <p className="page-eyebrow">EMPLOYEE SUPPORT</p>
                <div className="admin-ticket-detail-title-row">
                  <h3 id="admin-ticket-detail-title">{selectedTicket.ticket_id}</h3>
                  <span className={`admin-ticket-status ${statusClass(selectedTicket.status)}`}>
                    {selectedTicket.status}
                  </span>
                </div>
              </div>
              <button type="button" className="btn-icon" onClick={closeTicketDetails} aria-label="Close ticket details">×</button>
            </div>
            <div className="admin-ticket-detail-content">
              <div className="admin-ticket-detail-column">
                {detailError && <p className="admin-ticket-inline-error">{detailError}</p>}
                <section className="admin-ticket-detail-section">
                  <h4>Employee information</h4>
                  <dl className="admin-ticket-employee-details">
                    <div><dt>Name</dt><dd>{selectedTicket.employee_name}</dd></div>
                    <div><dt>Email</dt><dd>{selectedTicket.employee_email}</dd></div>
                    <div><dt>Phone</dt><dd>{selectedTicket.employee_phone || "—"}</dd></div>
                    <div><dt>Date raised</dt><dd>{formatDate(selectedTicket.created_at)}</dd></div>
                    <div><dt>Last updated</dt><dd>{formatDate(selectedTicket.updated_at)}</dd></div>
                    <div><dt>Status</dt><dd><span className={`admin-ticket-status ${statusClass(selectedTicket.status)}`}>{selectedTicket.status}</span></dd></div>
                  </dl>
                </section>
                <section className="admin-ticket-detail-section">
                  <h4>Complete problem description</h4>
                  <p className="admin-ticket-full-description">{selectedTicket.description}</p>
                  {selectedTicket.decline_reason && (
                    <div className="admin-ticket-decline-reason">
                      <strong>Decline reason</strong>
                      <p>{selectedTicket.decline_reason}</p>
                    </div>
                  )}
                </section>
                {selectedTicket.status === "Pending" && (
                  <section className="admin-ticket-detail-section">
                    <h4>Admin actions</h4>
                    <div className="admin-ticket-admin-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={working}
                        onClick={() => setPendingAction({ status: "Accepted" })}
                      >
                        Accept ticket
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        disabled={working}
                        onClick={() => {
                          setDeclineReason("");
                          setPendingAction({ status: "Declined" });
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </section>
                )}
                {selectedTicket.status === "Accepted" && (
                  <section className="admin-ticket-detail-section">
                    <h4>Admin actions</h4>
                    <div className="admin-ticket-admin-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={working}
                        onClick={() => void changeStatus(selectedTicket, "In Progress")}
                      >
                        Move to In Progress
                      </button>
                    </div>
                  </section>
                )}
              </div>

              <div className="admin-ticket-detail-column">
                <section className="admin-ticket-detail-section">
                  <h4>Status history</h4>
                  {!selectedTicket.status_history?.length ? (
                    <p className="admin-ticket-muted">No status history is available.</p>
                  ) : (
                    <ol className="admin-ticket-history">
                      {selectedTicket.status_history.map((item, index) => (
                        <li key={`${item.changed_at}-${index}`}>
                          <span className={`admin-ticket-status ${statusClass(item.status)}`}>
                            {historyEventName(item.status)}
                          </span>
                          <strong>{historyActor(selectedTicket, item)}</strong>
                          <time dateTime={item.changed_at || undefined}>
                            {formatDate(item.changed_at)}
                          </time>
                          {item.note && item.status !== "Pending" && <p>{item.note}</p>}
                        </li>
                      ))}
                    </ol>
                  )}
                </section>

                <section className="admin-ticket-detail-section">
                  <h4>Chat / conversation</h4>
                  <div className="admin-ticket-chat-messages" ref={messageListRef}>
                    {messages.length === 0 ? (
                      <p className="admin-ticket-muted">No messages in this ticket conversation yet.</p>
                    ) : messages.map((message, index) => (
                      <article
                        className={`admin-ticket-chat-message ${message.sender_role === "admin" ? "admin" : "employee"}`}
                        key={`${message.timestamp}-${index}`}
                      >
                        <strong>{message.sender_name} <small>{message.sender_role}</small></strong>
                        <p>{message.message}</p>
                        <time>{formatDate(message.timestamp)}</time>
                      </article>
                    ))}
                  </div>
                  {selectedTicket.status === "Closed" ? (
                    <p className="admin-ticket-closed-note">Employee closed this ticket. New messages are disabled.</p>
                  ) : (
                    <form className="admin-ticket-chat-form" onSubmit={handleSendMessage}>
                      <textarea
                        value={messageDraft}
                        onChange={(event) => setMessageDraft(event.target.value)}
                        rows={2}
                        maxLength={5000}
                        required
                        placeholder="Write a reply..."
                      />
                      <button className="btn btn-primary" disabled={sending || !messageDraft.trim()} type="submit">
                        {sending ? "Sending..." : "Send"}
                      </button>
                    </form>
                  )}
                </section>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
