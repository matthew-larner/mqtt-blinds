import * as net from "net";

const connect = (
  host: string,
  port: number,
  reconnectSeconds: number = 15,
  idleSeconds: number = 60
) => {
  const client = new net.Socket();
  let timedOut = false;
  console.info("NET TRY", host, port);
  client.on("connect", () => {
    console.info("Connected to roller-blind");
    client.setTimeout(idleSeconds * 1000);
  });

  client.on("close", () => {
    console.info("roller-blind connection closed");

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
    console.info(`Blind error: ${err.message}`);
  });

  client.on("timeout", () => {
    console.info(
      `No TCP communication detected in the last ${idleSeconds} seconds. Force reconnecting...`
    );
    timedOut = true;
    client.end();
  });

  client.connect(port, host);

  const onMessage = (callback: (data: Buffer) => void) => {
    client.on("data", callback);
  };

  const write = (data: Buffer, cb?: (error?: Error) => void) => {
    console.info("TCP command to be sent:", data);
    client.write(data, (err) => {
      if (err) {
        console.info(`Sending message to roller-blind failed: ${err.message}`);
      }
      cb();
    });
  };

  return {
    onMessage,
    write,
  };
};

export default connect;
