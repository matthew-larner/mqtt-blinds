import * as logger from "../lib/logger/logger";
import * as dgram from "dgram";

const connect = async (host: string, port: number) => {
  var client = dgram.createSocket("udp4");

  // Since UDP Don't have state. it's better to initiate connection this way.
  var data = Buffer.from("Client connected ...");
  client.send(data, port, host, function (error) {
    if (error) {
      client.close();
    } else {
      console.info("ClientConnected.");
    }
  });

  client.on("error", (err) => {
    console.error(`server error:\n${err.stack}`);
    client.close();
  });

  client.on("timeout", () => {
    logger.info(`No UDP communication detected in the  Force reconnecting...`);
    // timedOut = true;
    // client.end();
  });
  const send = (topic: string, payload: any) => {
    const buff = Buffer.from(topic, "utf-8");
    client.send(buff, payload, buff.length, port, host, function (err, bytes) {
      if (err) throw err;
      console.info(`UDP client message sent to -> ${topic} : ${port}`);
    });
  };

  const onMessage = (callback: (data: Buffer) => void) => {
    client.on("message", callback);
  };

  return { onMessage, send };
};

export default connect;
