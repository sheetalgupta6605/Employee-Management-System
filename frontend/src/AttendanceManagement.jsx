import { Fragment, useEffect, useMemo, useState } from "react";
import { api, downloadFile } from "./api";

const localDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const shiftMonth = (value, amount) => {
  const [year, month] = value.split("-").map(Number);
  const next = new Date(year, month - 1 + amount, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
};
const shiftYear = (value, amount) => `${Number(value.slice(0, 4)) + amount}${value.slice(4)}`;
const monthLabel = (value) => new Date(`${value}-01T12:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
const statusClass = (status) => status.toLowerCase().replace(/\s+/g, "-");
const compareEmployeeCodes = (first, second) => {
  const firstCode = String(first.employee_code || "").trim();
  const secondCode = String(second.employee_code || "").trim();
  if (!firstCode || !secondCode) return firstCode ? -1 : secondCode ? 1 : 0;
  return firstCode.localeCompare(secondCode, undefined, { numeric: true, sensitivity: "base" });
};

export function AdminAttendance({ showToast }) {
  const [dateValue, setDateValue] = useState(localDate(new Date()));
  const [rows, setRows] = useState([]);
  const [monthRows, setMonthRows] = useState([]);
  const [isHoliday, setIsHoliday] = useState(false);
  const [monthView, setMonthView] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchMode, setSearchMode] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(localDate(new Date()).slice(0, 7));
  const [leaveRequests, setLeaveRequests] = useState([]);
  const month = dateValue.slice(0, 7);
  const [calendarYear, calendarMonthNumber] = calendarMonth.split("-").map(Number);
  const calendarOffset = new Date(calendarYear, calendarMonthNumber - 1, 1).getDay();
  const calendarDaysInMonth = new Date(calendarYear, calendarMonthNumber, 0).getDate();
  const calendarCells = [...Array(calendarOffset).fill(null), ...Array.from({ length: calendarDaysInMonth }, (_, index) => index + 1)];

  async function load() {
    setBusy(true);
    try {
      const [daily, monthly, requests, employees, holidays] = await Promise.all([
        api(`/attendance?date=${dateValue}`),
        api(`/attendance/monthly?month=${month}`),
        api("/attendance/leave-requests?status=pending"),
        api("/employees"),
        api(`/attendance/holidays?month=${month}`),
      ]);
      const employeeCodes = new Map((employees || []).map((employee) => [employee.id, employee.employee_id]));
      const addEmployeeCodes = (records) => (records || []).map((row) => ({
        ...row,
        employee_code: row.employee_code || employeeCodes.get(row.employee_id) || "",
      }));
      setRows(addEmployeeCodes(daily));
      setMonthRows(addEmployeeCodes(monthly));
      setLeaveRequests(requests || []);
      setIsHoliday((holidays || []).some((holiday) => holiday.date === dateValue));
    } catch (error) {
      showToast(error.message || "Could not load attendance.", "error");
    } finally { setBusy(false); }
  }
  useEffect(() => { load(); }, [dateValue]);

  const filtered = useMemo(() => rows.filter((row) =>
    (!search || `${row.employee_name} ${row.department}`.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === "all" || row.status === statusFilter)).sort(compareEmployeeCodes), [rows, search, statusFilter]);
  const monthlyFiltered = useMemo(() => monthRows.filter((row) =>
    (!search || `${row.employee_name} ${row.department}`.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === "all" || row.status === statusFilter)).sort((first, second) =>
    first.date.localeCompare(second.date) || compareEmployeeCodes(first, second)), [monthRows, search, statusFilter]);
  const count = (status) => rows.filter((row) => row.status === status).length;
  const monthlyGroups = useMemo(() => {
    const groups = new Map();
    monthlyFiltered.forEach((row) => {
      if (!groups.has(row.date)) groups.set(row.date, []);
      groups.get(row.date).push(row);
    });
    return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [monthlyFiltered]);
  function updateRow(employeeId, changes) {
    setRows((current) => current.map((row) => row.employee_id === employeeId ? { ...row, ...changes } : row));
  }
  async function save() {
    if (isHoliday) return;
    setSaving(true);
    try {
      const records = rows.map((row) => ({ employee_id: row.employee_id, status: row.status, leave_reason: row.leave_reason || "", attachment_name: row.attachment_name || "" }));
      await api("/attendance", { method: "PUT", body: JSON.stringify({ date: dateValue, records }) });
      showToast("Attendance saved for all employees.", "success");
      await load();
    } catch (error) { showToast(error.message || "Could not save attendance.", "error"); }
    finally { setSaving(false); }
  }
  async function toggleHoliday() {
    const markingHoliday = !isHoliday;
    if (markingHoliday && !window.confirm(`Mark ${dateValue} as a holiday? This will delete saved attendance records for all employees on that date.`)) return;
    setSaving(true);
    try {
      await api(markingHoliday ? "/attendance/holidays" : `/attendance/holidays?date=${dateValue}`, {
        method: markingHoliday ? "PUT" : "DELETE",
        ...(markingHoliday ? { body: JSON.stringify({ date: dateValue, name: "Holiday" }) } : {}),
      });
      showToast(markingHoliday ? "Holiday marked and attendance cleared for this date." : "Holiday cleared. You can mark attendance for this date.", "success");
      await load();
    } catch (error) { showToast(error.message || "Could not update the holiday.", "error"); }
    finally { setSaving(false); }
  }
  async function reviewLeaveRequest(request, status) {
    try {
      await api(`/attendance/leave-requests/${request.id}/review`, { method: "POST", body: JSON.stringify({ status }) });
      showToast(`Leave request ${status}.`, "success");
      await load();
    } catch (error) { showToast(error.message || "Could not review leave request.", "error"); }
  }
  return <section className="attendance-module">
    <div className="attendance-control-row">
      <div className="attendance-date-controls">
        <button className="btn btn-secondary" onClick={() => { setDateValue(localDate(new Date())); setMonthView(false); setSearchMode(""); }}>Today</button>
        <button className={`btn ${searchMode === "calendar" ? "btn-primary" : "btn-secondary"}`} aria-expanded={searchMode === "calendar"} onClick={() => { setCalendarMonth(month); setSearchMode((current) => current === "calendar" ? "" : "calendar"); setMonthView(false); }}>Calendar</button>
      </div>
      {searchMode === "calendar" && <div className="attendance-calendar-popover" role="dialog" aria-label="Choose attendance date"><div className="attendance-calendar-heading"><button type="button" aria-label="Previous year" onClick={() => setCalendarMonth((current) => shiftYear(current, -1))}>«</button><button type="button" aria-label="Previous month" onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}>‹</button><strong>{monthLabel(calendarMonth)}</strong><button type="button" aria-label="Next month" onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}>›</button><button type="button" aria-label="Next year" onClick={() => setCalendarMonth((current) => shiftYear(current, 1))}>»</button></div><div className="attendance-calendar-weekdays">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}</div><div className="attendance-calendar-grid">{calendarCells.map((day, index) => day ? <button type="button" key={`${calendarMonth}-${day}`} className={dateValue === `${calendarMonth}-${String(day).padStart(2, "0")}` ? "selected" : ""} aria-label={`Select ${monthLabel(calendarMonth)} ${day}`} aria-pressed={dateValue === `${calendarMonth}-${String(day).padStart(2, "0")}`} onClick={() => { setDateValue(`${calendarMonth}-${String(day).padStart(2, "0")}`); setMonthView(false); setSearchMode(""); }}>{day}</button> : <span key={`empty-${index}`} />)}</div><button type="button" className="attendance-calendar-month-action" onClick={() => { setDateValue(`${calendarMonth}-01`); setMonthView(true); setSearchMode(""); }}>View full month</button></div>}
      <input className="input-field no-icon attendance-search" placeholder="Search employee or department" value={search} onChange={(event) => setSearch(event.target.value)} />
      <select className="toolbar-select attendance-status-filter" aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option>Present</option><option>Absent</option><option>Leave</option></select>
    </div>
    {!monthView && <section className="panel-card attendance-daily-chart"><div className="panel-card-header"><div className="panel-title-group"><h2>Daily attendance · {dateValue}</h2>
    {/* <p>{isHoliday ? "Holiday · no attendance record for this date" : "Present, absent, and leave across the workforce"}</p> */}
    </div></div>{!isHoliday && <><div className="daily-attendance-bar"><span className="daily-segment present" style={{ width: `${rows.length ? count("Present") / rows.length * 100 : 0}%` }} /><span className="daily-segment absent" style={{ width: `${rows.length ? count("Absent") / rows.length * 100 : 0}%` }} /><span className="daily-segment leave" style={{ width: `${rows.length ? count("Leave") / rows.length * 100 : 0}%` }} /></div><div className="daily-attendance-legend"><span className="present-text">● Present {count("Present")}</span><span className="absent-text">● Absent {count("Absent")}</span><span className="leave-text">● Leave {count("Leave")}</span></div></>}</section>}
    <section className="panel-card attendance-panel">
      <div className="panel-card-header"><div className="panel-title-group"><h2>{monthView ? `Attendance records · ${monthLabel(month)}` : "Mark Attendance "}</h2>
      {/* <p>Unmarked employees are saved as present.</p> */}
      </div></div>
      {!monthView && <div className="attendance-bulk-actions attendance-save-actions"><button type="button" className="btn btn-secondary" disabled={saving || busy} title="Use for Sundays, festivals, or any day with no attendance" onClick={toggleHoliday}>{isHoliday ? "Clear holiday" : "Mark holiday"}</button><button className="btn btn-primary" disabled={saving || busy || isHoliday} onClick={save}>{saving ? "Saving…" : "Save attendance"}</button></div>}
      <div className="table-responsive-wrapper">
        <table className="ems-table attendance-table">
          <thead><tr>{monthView && <th>Date</th>}<th>Employee ID</th><th>Employee</th><th>Department</th><th>Status</th><th>Leave Reason</th><th>Leave Attachment</th></tr></thead>
          <tbody>
            {monthView ? monthlyGroups.map(([recordDate, dateRows]) => <Fragment key={recordDate}>
              <tr className="attendance-date-group"><th colSpan="7">{new Date(`${recordDate}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</th></tr>
              {dateRows.map((row) => <tr key={`${recordDate}-${row.employee_id}`}><td>{recordDate}</td><td>{row.employee_code || "—"}</td><td>{row.employee_name}</td><td>{row.department || "General"}</td><td><span className={`attendance-status-pill ${statusClass(row.status)}`}>{row.status}</span></td><td>{row.status === "Leave" ? row.leave_reason || "—" : "—"}</td><td>{row.status === "Leave" && row.attachment_id ? <button type="button" className="attendance-attachment-link" onClick={() => downloadFile(`/attendance/attachments/${row.attachment_id}`)}>{row.attachment_name || "View attachment"}</button> : "—"}</td></tr>)}
            </Fragment>) : filtered.map((row) => <tr key={`${dateValue}-${row.employee_id}`}>
              <td>{row.employee_code || "—"}</td><td>{row.employee_name}</td><td>{row.department || "General"}</td>
              <td>{isHoliday ? <span className="attendance-status-pill no-record">No record</span> : <select className={`attendance-status-select ${statusClass(row.status)}`} value={row.status} onChange={(event) => updateRow(row.employee_id, { status: event.target.value })}><option>Present</option><option>Absent</option><option>Leave</option></select>}</td>
              <td>{row.status === "Leave" ? row.leave_reason || "—" : "—"}</td><td>{row.status === "Leave" && row.attachment_id ? <button type="button" className="attendance-attachment-link" onClick={() => downloadFile(`/attendance/attachments/${row.attachment_id}`)}>{row.attachment_name || "View attachment"}</button> : "—"}</td>
            </tr>)}
          </tbody>
        </table>
        {!busy && (monthView ? monthlyFiltered : filtered).length === 0 && <div className="attendance-empty">No attendance records match these filters.</div>}
      </div>
    </section>
    <section className="panel-card leave-requests-admin"><div className="panel-card-header"><div className="panel-title-group"><h2>Leave requests</h2><p>{leaveRequests.length} pending review</p></div></div>{leaveRequests.length ? <div className="leave-request-list">{leaveRequests.map((request) => <article className="leave-request-row" key={request.id}><div className="leave-request-details"><strong>{request.employee_name}</strong><span>{request.department} · {request.date}</span><p>{request.reason}</p>{request.attachment_id && <button className="attendance-attachment-link" type="button" onClick={() => downloadFile(`/attendance/leave-requests/${request.id}/attachment`)}>View attachment · {request.attachment_name || "file"}</button>}</div><div className="leave-request-actions"><button type="button" className="btn btn-primary" onClick={() => reviewLeaveRequest(request, "approved")}>Approve</button><button type="button" className="btn btn-danger" onClick={() => reviewLeaveRequest(request, "declined")}>Decline</button></div></article>)}</div> :
    
    <p className="attendance-summary-note">No leave requests need review.</p>
    }</section>
  </section>;
}

export function EmployeeAttendanceSummary({ showToast }) {
  const [summary, setSummary] = useState(null);
  const [month, setMonth] = useState(localDate(new Date()).slice(0, 7));
  const [selectedDay, setSelectedDay] = useState(Number(localDate(new Date()).slice(-2)));
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(localDate(new Date()).slice(0, 7));
  const [error, setError] = useState(false);
  const [requests, setRequests] = useState([]);
  const [requestDate, setRequestDate] = useState(localDate(new Date()));
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([api(`/employees/me/attendance?month=${month}`), api("/employees/me/leave-requests")]).then(([data, leaveData]) => { if (active) { setSummary(data); setRequests(leaveData || []); setError(false); } }).catch((err) => { if (active) { setError(true); showToast(err.message || "Could not load attendance summary.", "error"); } });
    const refreshTimer = window.setInterval(() => {
      api(`/employees/me/attendance?month=${month}`).then((data) => {
        if (active) { setSummary(data); setError(false); }
      }).catch(() => {});
    }, 30000);
    return () => { active = false; window.clearInterval(refreshTimer); };
  }, [month]);
  async function submitLeaveRequest(event) {
    event.preventDefault();
    if (!reason.trim()) { showToast("Enter a reason for your leave request.", "error"); return; }
    setSubmitting(true);
    try {
      let attachmentData = null;
      if (attachment) attachmentData = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(attachment); });
      const created = await api("/employees/me/leave-requests", { method: "POST", body: JSON.stringify({ date: requestDate, reason: reason.trim(), attachment_name: attachment?.name || "", attachment_data: attachmentData }) });
      setRequests((current) => [created, ...current]); setReason(""); setAttachment(null);
      showToast("Leave request sent to your administrator.", "success");
    } catch (err) { showToast(err.message || "Could not submit leave request.", "error"); }
    finally { setSubmitting(false); }
  }
  const tracked = (summary?.present_days || 0) + (summary?.absent_days || 0) + (summary?.leave_days || 0);
  const percentage = tracked ? Math.round((summary.present_days / tracked) * 100) : 0;
  const todayStatus = summary?.today?.status || "Present";
  const [calendarYear, calendarMonth] = month.split("-").map(Number);
  const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
  const firstWeekday = new Date(calendarYear, calendarMonth - 1, 1).getDay();
  const calendarDays = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const activeDay = Math.min(selectedDay, daysInMonth);
  const activeDate = `${month}-${String(activeDay).padStart(2, "0")}`;
  const activeRecord = summary?.records?.find((record) => record.date === activeDate);
  const recordByDate = new Map((summary?.records || []).map((record) => [record.date, record]));
  const [pickerYear, pickerMonthNumber] = pickerMonth.split("-").map(Number);
  const pickerOffset = new Date(pickerYear, pickerMonthNumber - 1, 1).getDay();
  const pickerDaysInMonth = new Date(pickerYear, pickerMonthNumber, 0).getDate();
  const pickerCells = [...Array(pickerOffset).fill(null), ...Array.from({ length: pickerDaysInMonth }, (_, index) => index + 1)];
  return <>
    {!error && <div className="employee-today-status-card"><div><h3>Today's status</h3><span>{summary?.today?.date || localDate(new Date())}</span></div><strong className={`attendance-status-pill ${statusClass(todayStatus)}`}>{todayStatus === "Present" ? "✅ Present" : todayStatus === "Absent" ? "❌ Absent" : todayStatus === "Leave" ? "📝 Leave" : "— No record"}</strong></div>}
    <section className="panel-card employee-attendance-card" aria-label="Attendance summary">
    <div className="panel-card-header"><div className="panel-title-group"><h2>Attendance summary</h2><p>Your attendance recorded by the administrator</p></div><div className="employee-attendance-month-picker"><button type="button" className="employee-month-picker-trigger" aria-expanded={monthPickerOpen} aria-label={`Choose date, currently ${monthLabel(month)}`} onClick={() => { setPickerMonth(month); setMonthPickerOpen((open) => !open); }}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></svg><span>{monthLabel(month)}</span></button>{monthPickerOpen && <div className="attendance-calendar-popover employee-month-picker-popover" role="dialog" aria-label="Choose attendance date"><div className="attendance-calendar-heading"><button type="button" aria-label="Previous year" onClick={() => setPickerMonth((current) => shiftYear(current, -1))}>«</button><button type="button" aria-label="Previous month" onClick={() => setPickerMonth((current) => shiftMonth(current, -1))}>‹</button><strong>{monthLabel(pickerMonth)}</strong><button type="button" aria-label="Next month" onClick={() => setPickerMonth((current) => shiftMonth(current, 1))}>›</button><button type="button" aria-label="Next year" onClick={() => setPickerMonth((current) => shiftYear(current, 1))}>»</button></div><div className="attendance-calendar-weekdays">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}</div><div className="attendance-calendar-grid">{pickerCells.map((day, index) => day ? <button type="button" key={`${pickerMonth}-${day}`} className={pickerMonth === month && day === activeDay ? "selected" : ""} aria-label={`Select ${monthLabel(pickerMonth)} ${day}`} aria-pressed={pickerMonth === month && day === activeDay} onClick={() => { setMonth(pickerMonth); setSelectedDay(day); setMonthPickerOpen(false); }}>{day}</button> : <span key={`picker-empty-${index}`} />)}</div></div>}</div></div>
    {error ? <p className="attendance-summary-note">Attendance summary is temporarily unavailable.</p> : <>
      <div className="employee-attendance-panels">
        <article className="employee-attendance-panel">
          <h3>Attendance totals</h3>
          <div className="employee-attendance-stats">{[["Present days", summary?.present_days || 0, "present"], ["Absent days", summary?.absent_days || 0, "absent"], ["Leave days", summary?.leave_days || 0, "leave"], ["Attendance", `${percentage}%`, "rate"]].map(([label, value, tone]) => <div className={`employee-attendance-stat ${tone}`} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
        </article>
        <article className="employee-attendance-panel employee-calendar-panel">
          <h3>Monthly attendance</h3>
          <div className="attendance-progress-label"><span>Attendance rate</span><strong>{percentage}%</strong></div><div className="attendance-progress-track"><div className="attendance-progress-value" style={{ width: `${percentage}%` }} /></div>
          <div className="employee-calendar-layout">
            <div className="employee-month-calendar-wrap">
              <div className="employee-month-weekdays" aria-hidden="true">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div>
              <div className="employee-month-calendar" role="group" aria-label={`Attendance calendar for ${month}`}>
                {calendarDays.map((day, index) => {
                  if (!day) return <span className="attendance-calendar-empty" key={`empty-${index}`} aria-hidden="true" />;
                  const date = `${month}-${String(day).padStart(2, "0")}`;
                  const record = recordByDate.get(date);
                  const status = record?.status || "unrecorded";
                  return <button type="button" key={date} className={`attendance-calendar-day ${statusClass(status)} ${day === activeDay ? "selected" : ""}`} title={`${date}: ${record?.status || "No attendance recorded"}`} aria-label={`${day}, ${record?.status || "No attendance recorded"}`} aria-pressed={day === activeDay} onClick={() => setSelectedDay(day)}>{day}</button>;
                })}
              </div>
            </div>
            <aside className="employee-calendar-details" aria-live="polite">
              <div className="attendance-selected-day"><strong>{new Date(`${activeDate}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</strong><span className={activeRecord ? `attendance-status-pill ${statusClass(activeRecord.status)}` : "attendance-day-unrecorded"}>{activeRecord?.status || "No attendance recorded"}</span></div>
              <div className="employee-calendar-legend" aria-label="Attendance status colors"><span><i className="present" />Present</span><span><i className="absent" />Absent</span><span><i className="leave" />Leave</span><span><i className="unrecorded" />No record</span></div>
              <p className="attendance-summary-note">{summary?.last_updated ? `Last updated ${new Date(summary.last_updated).toLocaleString()}` : "No saved records for this month yet."}</p>
            </aside>
          </div>
        </article>
      </div>
      <div className="leave-request-employee"><h3>Request leave</h3><p>Choose a day and send your reason to the administrator for approval.</p><form className="leave-request-form" onSubmit={submitLeaveRequest}><label>Date<input type="date" required value={requestDate} onChange={(event) => setRequestDate(event.target.value)} /></label><label>Reason<textarea maxLength={1000} required placeholder="Why do you need leave?" value={reason} onChange={(event) => setReason(event.target.value)} /></label><label>Application attachment (optional)<input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size > 5 * 1024 * 1024) { showToast("Leave attachments must be 5MB or smaller.", "error"); event.target.value = ""; return; } setAttachment(file || null); }} /></label>{attachment && <small>{attachment.name}</small>}<button className="btn btn-primary" disabled={submitting}>{submitting ? "Sending…" : "Submit leave request"}</button></form>
        <div className="employee-leave-history"><h3>Your leave requests</h3>{requests.length ? requests.map((request) => <div className="employee-leave-request" key={request.id}><span><strong>{request.date}</strong> · {request.reason}</span><span className={`leave-request-status ${request.status}`}>{request.status}</span>{request.attachment_name && <small>{request.attachment_name}</small>}</div>) : <p className="attendance-summary-note">You have not submitted a leave request.</p>}</div>
      </div>
    </>}
    </section>
  </>;
}
