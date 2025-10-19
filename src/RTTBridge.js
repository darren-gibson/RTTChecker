import fetch from "node-fetch";

export const hhmmToMins = t => parseInt(t.slice(0,2), 10)*60 + parseInt(t.slice(2,4), 10);

export function mapLatenessToState(late) {
  if (late == null) return "unknown";
  const a = Math.abs(late);
  if (a <= 2) return "good";
  if (a <= 5) return "fair";
  if (a <= 10) return "poor";
  return "very poor";
}

export const b64 = (u,p) => Buffer.from(`${u}:${p}`).toString("base64");

export async function rttSearch(crs, date, { user, pass, fetchImpl } = {}) {
  const RTT_USER = user || process.env.RTT_USER;
  const RTT_PASS = pass || process.env.RTT_PASS;
  const url = `https://api.rtt.io/api/v1/json/search/${crs}/${date}`;
  const res = await (fetchImpl || fetch)(url, { headers: { Authorization: `Basic ${b64(RTT_USER, RTT_PASS)}` } });
  if (!res.ok) throw new Error(`RTT ${res.status}`);
  return res.json();
}

export function pickNextService(services, afterHHmm) {
  if (!Array.isArray(services)) return undefined;
  const after = hhmmToMins(afterHHmm);
  return services.find(s => {
    const t = s.locationDetail?.gbttBookedDeparture; // "HHmm"
    return t && hhmmToMins(t) >= after;
  });
}
