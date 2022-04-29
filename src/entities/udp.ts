const connect = async (host: string, port: number) => {
  const dgram = require("dgram");

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

  const send = (topic: string, payload: string) => {
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
