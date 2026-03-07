const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const WebSocket = require('ws');

const CHANNEL = 'dgh4zx6l';
const WS_URL = 'ws://localhost:3055';

const FRAMES = {
  '12:41': '01-menu.png',
  '12:42': '02-tutorial.png',
  '12:43': '08-mode-select.png',
  '12:44': '09-playing.png',
  '12:45': '10-paused.png',
  '12:46': '11-pause-confirm.png',
  '12:47': '13-gameover-firsttime.png',
  '12:48': '14-gameover-returning.png',
  '12:49': '05a-missions-progress.png',
  '12:50': '05b-missions-claimable.png',
  '12:51': '05c-missions-claimed.png',
  '12:52': '06-achievements.png',
  '12:53': '07a-daily-rewards.png',
  '12:59': '07b-daily-rewards-claimed.png',
  '12:54': '03-settings.png',
  '12:55': '04-stats.png',
  '12:56': '15-share.png',
  '12:57': '16-leaderboard.png',
  '12:58': '17-nickname-edit.png',
};

const IMG_DIR = path.join(__dirname, '..', 'screenshots');

function waitForMessage(ws, filterFn, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const handler = (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (filterFn(msg)) {
          ws.off('message', handler);
          clearTimeout(timer);
          resolve(msg);
        }
      } catch {}
    };
    const timer = setTimeout(() => {
      ws.off('message', handler);
      reject(new Error('Timeout'));
    }, timeoutMs);
    ws.on('message', handler);
  });
}

async function main() {
  const ws = new WebSocket(WS_URL);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  console.log('WebSocket connected');

  // Wait for welcome message
  const welcome = await waitForMessage(ws, m => m.type === 'system', 5000);
  console.log('Welcome:', welcome.message);

  // Join channel: { type: "join", channel: "..." }
  const joinId = randomUUID();
  const joinPromise = waitForMessage(ws, m => m.type === 'system' && m.channel === CHANNEL, 5000);
  ws.send(JSON.stringify({ id: joinId, type: 'join', channel: CHANNEL }));
  const joinResp = await joinPromise;
  console.log('Joined:', joinResp.message);

  // Upload each image
  const entries = Object.entries(FRAMES);
  for (let i = 0; i < entries.length; i++) {
    const [nodeId, filename] = entries[i];
    const filePath = path.join(IMG_DIR, filename);

    if (!fs.existsSync(filePath)) {
      console.log(`[${i + 1}/${entries.length}] SKIP: ${filename}`);
      continue;
    }

    const base64 = fs.readFileSync(filePath).toString('base64');
    const cmdId = randomUUID();
    console.log(`[${i + 1}/${entries.length}] ${filename} (${Math.round(base64.length / 1024)}KB) → ${nodeId}`);

    // Send as message type (like MCP server does)
    let responsePromise = waitForMessage(ws, m => {
      // Look for broadcast with our command ID in the response
      return m.type === 'broadcast' && m.sender === 'You' &&
             m.message && m.message.id === cmdId;
    }, 60000);

    ws.send(JSON.stringify({
      id: cmdId,
      type: 'message',
      channel: CHANNEL,
      message: {
        id: cmdId,
        command: 'set_image',
        params: {
          nodeId,
          imageData: base64,
          scaleMode: 'FILL',
          commandId: cmdId,
        },
      },
    }));

    let success = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Wait for our own broadcast echo (confirms it was sent)
        await responsePromise;
        // Now wait for the Figma plugin's response
        const result = await waitForMessage(ws, m => {
          return m.type === 'broadcast' && m.sender !== 'You' &&
                 m.message && (m.message.id === cmdId ||
                 (m.message.commandId === cmdId));
        }, 60000);
        console.log(`  OK`);
        success = true;
        break;
      } catch (err) {
        console.error(`  ERROR (attempt ${attempt}/3): ${err.message}`);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 1000));
          // Re-send the command
          const retryCmdId = randomUUID();
          responsePromise = waitForMessage(ws, m => {
            return m.type === 'broadcast' && m.sender === 'You' &&
                   m.message && m.message.id === retryCmdId;
          }, 60000);
          ws.send(JSON.stringify({
            id: retryCmdId,
            type: 'message',
            channel: CHANNEL,
            message: {
              id: retryCmdId,
              command: 'set_image',
              params: { nodeId, imageData: base64, scaleMode: 'FILL', commandId: retryCmdId },
            },
          }));
        }
      }
    }

    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\nDone!');
  ws.close();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
