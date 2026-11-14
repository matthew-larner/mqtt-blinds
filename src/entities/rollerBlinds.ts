import * as net from "net";
import { EventEmitter } from "events";
import * as logger from "../lib/logger/logger";

/** TCP chunks are not protocol messages. Retain partial frames between reads. */
export const createFrameDecoder = (onFrame: (data: Buffer) => void) => {
  let pending = "";
  return (data: Buffer) => {
    pending += data.toString("utf8");
    let end: number;
    while ((end = pending.indexOf(";")) !== -1) {
      const frame = pending.slice(0, end + 1);
      pending = pending.slice(end + 1);
      const start = frame.lastIndexOf("!");
      if (start !== -1) onFrame(Buffer.from(frame.slice(start)));
    }
    // Discard malformed input rather than accumulating it indefinitely.
    if (pending.length > 4096) pending = "";
  };
};

/** Accept a command echo or a matching final position, never an unrelated reply. */
export const isCommandResponse = (command: string, response: string): boolean => {
  if (response.replace(/,[^;]*;$/, ";") === command) return true;
  const match = /^!(.+?)([ocsm])([0-9]{3})?;$/.exec(command);
  if (!match) return false;
  const prefix = `!${match[1]}`;
  if (!response.startsWith(prefix)) return false;
  const report = /^r([0-9]{3})(?:b[0-9]+)?(?:,[^;]*)?;$/.exec(response.slice(prefix.length));
  if (!report) return false;
  const expected = match[2] === "o" ? 0 : match[2] === "c" ? 100
    : match[2] === "m" ? Number(match[3]) : null;
  return expected !== null && Number(report[1]) === expected;
};

const connect = async (
  host: string,
  port: number,
  reconnectSeconds = 10,
  createSocket: () => net.Socket = () => new net.Socket()
) => {
  const events = new EventEmitter();
  let client: net.Socket;
  let connected = false;
  let stopped = false;
  let reconnectTimer: NodeJS.Timeout;
  let connectTimer: NodeJS.Timeout;

  const setConnected = (value: boolean) => {
    connected = value;
    events.emit("status", value);
  };

  const open = () => {
    if (stopped) return;
    const socket = createSocket();
    client = socket;
    const decode = createFrameDecoder(data => events.emit("message", data));
    socket.setKeepAlive(true, 30000);
    socket.setNoDelay(true);
    socket.on("data", decode);
    socket.on("connect", () => {
      clearTimeout(connectTimer);
      setConnected(true);
      logger.info(`Connected to blind controller ${host}:${port}`);
      events.emit("ready");
    });
    socket.on("error", error => {
      logger.error(`Blind controller ${host}:${port}: ${error.message}`);
      setConnected(false);
      socket.destroy();
    });
    socket.on("close", () => {
      clearTimeout(connectTimer);
      setConnected(false);
      if (!stopped) reconnectTimer = setTimeout(open, reconnectSeconds * 1000);
    });
    connectTimer = setTimeout(() => {
      socket.destroy(new Error("Blind controller connection timed out"));
    }, 10000);
    socket.connect(port, host);
  };

  const write = async (data: string, timeoutMs = 10000): Promise<void> => {
    const expiresAt = Date.now() + timeoutMs;
    if (!connected) {
      await new Promise<void>((resolve, reject) => {
        const ready = () => { cleanup(); resolve(); };
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error("Timed out waiting for blind controller connection"));
        }, timeoutMs);
        const cleanup = () => {
          clearTimeout(timer);
          events.removeListener("ready", ready);
        };
        events.once("ready", ready);
      });
    }
    if (Date.now() >= expiresAt) throw new Error("Command send deadline expired");
    const socket = client;
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        socket.removeListener("error", failed);
        socket.removeListener("close", closed);
        events.removeListener("message", acknowledged);
      };
      const failed = (error: Error) => { cleanup(); socket.destroy(); reject(error); };
      const closed = () => failed(new Error("Blind controller disconnected before acknowledgement"));
      let written = false;
      let received = false;
      const complete = () => {
        if (written && received) { cleanup(); resolve(); }
      };
      const acknowledged = (frame: Buffer) => {
        if (isCommandResponse(data, frame.toString())) {
          received = true;
          complete();
        }
      };
      const timer = setTimeout(() => {
        failed(new Error("Blind controller acknowledgement timed out"));
        socket.destroy();
      }, Math.max(1, expiresAt - Date.now()));
      events.on("message", acknowledged);
      socket.once("error", failed);
      socket.once("close", closed);
      try {
        socket.write(data, (error?: Error) => {
          if (error) failed(error);
          else { written = true; complete(); }
        });
      } catch (error) {
        failed(error);
      }
    });
    // Echoes acknowledge receipt, not movement; only position reports update HA.
    logger.info(`Acknowledged command from ${host}:${port}: ${data}`);
  };

  open();
  return {
    write,
    onMessage: (callback: (data: Buffer) => void) => { events.on("message", callback); },
    onStatus: (callback: (online: boolean) => void) => {
      events.on("status", callback);
      callback(connected);
    },
    close: () => {
      stopped = true;
      clearTimeout(connectTimer);
      clearTimeout(reconnectTimer);
      client.destroy();
    },
  };
};

export default connect;
