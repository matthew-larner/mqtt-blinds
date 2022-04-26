const connect = (host: string, port: number) => {
  const dgram = require("dgram");

  var client = dgram.createSocket("udp4");

  client.connect(port, host);

  client.on("connect", function () {
    console.info("UDP is connected");
  });

  client.on("error", (err) => {
    console.error(`server error:\n${err.stack}`);
    client.close();
  });

  const send = (topic: string, payload: string) => {
    const buff = Buffer.from(topic, "utf-8");
    client.send(buff, payload, buff.length, function (err, bytes) {
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
