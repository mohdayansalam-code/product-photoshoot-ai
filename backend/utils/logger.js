import { supabase } from "../lib/db.js";

let alertBuffer = [];
let alertTimer = null;

function flushAlerts() {
  if (alertBuffer.length === 0) return;
  
  const failCount = alertBuffer.filter(e => e === 'generation_failure').length;
  const creditCount = alertBuffer.filter(e => e === 'credit_failed').length;
  const rawEvents = alertBuffer.length;
  
  if (process.env.SLACK_WEBHOOK_URL) {
    fetch(process.env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({text: `🚨 *[PRODUCTION ALERT SUMMARY]*\n*${rawEvents} critical events in the last minute.*\n• Generation Failures: ${failCount}\n• Credit Fails: ${creditCount}`})
    }).catch(() => {});
  }
  
  alertBuffer = [];
  alertTimer = null;
}

/**
 * Standardized Production Logger
 * Enforces pure consistency across tracking, telemetry, and debugging
 */
export async function logEvent(level, event, user_id, request_id = null, metadata = {}) {
  try {
    const logEntry = {
      level,           // 'info', 'warning', 'error'
      event,           // 'generation_start', 'generation_success', 'generation_failure', 'credit_deducted', 'credit_failed'
      user_id: user_id || null,
      request_id: request_id || null,
      metadata: metadata,
      timestamp: new Date().toISOString()
    };

    // Phase 1: Local Console Telemetry
    const actionTag = `[${logEntry.timestamp}] [${level.toUpperCase()}] ${event}`;
    const trackingTag = `| User: ${user_id || "null"} | Req: ${request_id || "none"}`;
    
    // 2. ADD SIMPLE ALERTING / RATE LIMITING
    if (event === "generation_failure" || event === "credit_failed") {
       console.error(`\n🚨 [PRODUCTION ALERT] CRITICAL EVENT DETECTED: ${event}\nUser: ${user_id || "null"}\nReq: ${request_id || "none"}\nMetadata:`, metadata, `\n`);
       
       alertBuffer.push(event);
       if (!alertTimer) {
         alertTimer = setTimeout(flushAlerts, 60000); // 1-minute buffer window
       }
    } else if (level === 'error') {
       console.error(actionTag, trackingTag, metadata);
    } else if (level === 'warning') {
       console.warn(actionTag, trackingTag, metadata);
    } else {
       console.log(actionTag, trackingTag, metadata);
    }

    // Phase 2: Database Persistence natively pushing trace_ids
    supabase.from("logs").insert(logEntry).then(() => {}).catch(() => {});
  } catch (err) {
    // Failsafe: Logging must NEVER break main execution loops
  }
}
