import * as net from "net";
import * as logger from "../lib/logger/logger";

const connect = async (
  host: string,
  port: number,
  reconnectSeconds: number = 10
) => {
  const client = new net.Socket();
  let timedOut = false;

  client.on("connect", () => {
    logger.info("Connected to TCP/UDP server");
  });

  client.on("close", () => {
    logger.info("TCP/UDP connection closed");
    if (timedOut) {
      client.connect(port, host);
      timedOut = false;
      return;
    } else {
      setTimeout(() => {
        logger.info("TCP/UDP connecting...");
        client.connect(port, host);
      }, reconnectSeconds * 1000);
    }
  });

  client.on("error", (err) => {
    logger.info(`Blind error: ${err.message}`);
  });

  client.connect(port, host);

  const onMessage = async (callback: (data: Buffer) => void) => {
    await client.on("data", callback);
  };

  const write = (data: string, cb?: (error?: Error) => void) => {
    logger.info(`TCP command to be sent-: ${data}`);
    return client.write(data);
  };

  return {
    onMessage,
    write,
  };
};

export default connect;
