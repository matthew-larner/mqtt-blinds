import * as net from "net";
import * as logger from "../lib/logger/logger";

const connect = async (
  host: string,
  port: number,
) => {
  const client = new net.Socket();

  client.on("connect", () => {
    logger.info("Connected to TCP/UDP server");
  });

  client.on("close", () => {
    logger.info("TCP/UDP connection closed");
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
    client.write(data);
  };

  return {
    onMessage,
    write,
  };
};

export default connect;
