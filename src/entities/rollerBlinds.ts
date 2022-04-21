import * as net from "net";
import * as logger from "../lib/logger/logger";

const connect = (
  host: string,
  port: number,
  reconnectSeconds: number = 15,
  idleSeconds: number = 60
) => {
  const client = new net.Socket();
  let timedOut = false;

  client.on("connect", () => {
    logger.info("Connected to roller-blind");
    client.setTimeout(idleSeconds * 1000);
  });

  client.on("close", () => {
    logger.info("roller-blind connection closed");

    if (timedOut) {
      client.connect(port, host);
      timedOut = false;

      return;
    }

    setTimeout(() => {
      client.connect(port, host);
    }, reconnectSeconds * 1000);
  });

  client.on("error", (err) => {
    logger.info(`Blind error: ${err.message}`);
  });

  client.on("timeout", () => {
    logger.info(
      `No TCP communication detected in the last ${idleSeconds} seconds. Force reconnecting...`
    );
    timedOut = true;
    client.end();
  });

  client.connect(port, host);

  const onMessage = (callback: (data: Buffer) => void) => {
    client.on("data", callback);
  };

  const write = (data: string, cb?: (error?: Error) => void) => {
    logger.info(`TCP command to be sent-: ${data}`);
    client.write(data);
    console.log("DONE WRITE");
  };

  return {
    onMessage,
    write,
  };
};

export default connect;
