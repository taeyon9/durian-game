// Ticket/Lives System — 5 daily free plays
const TicketManager = (() => {
  const DAILY_TICKETS = 5;
  const STORAGE_KEY = 'durianMergeTickets';

  function getData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  function getTickets() {
    let data = getData();
    const today = getTodayStr();
    if (!data || data.date !== today) {
      data = { tickets: DAILY_TICKETS, date: today };
      save(data);
    }
    return data.tickets;
  }

  function useTicket() {
    let data = getData();
    const today = getTodayStr();
    if (!data || data.date !== today) {
      data = { tickets: DAILY_TICKETS, date: today };
    }
    if (data.tickets <= 0) return false;
    data.tickets--;
    save(data);
    return true;
  }

  function addTicket() {
    let data = getData();
    const today = getTodayStr();
    if (!data || data.date !== today) {
      data = { tickets: DAILY_TICKETS, date: today };
    }
    data.tickets++;
    save(data);
    return data.tickets;
  }

  function hasTickets() { return getTickets() > 0; }

  return { getTickets, useTicket, addTicket, hasTickets };
})();
