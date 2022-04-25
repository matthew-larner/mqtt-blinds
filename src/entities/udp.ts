const connect = (host: string, port: number) => {
  const dgram = require("dgram");

  var client = dgram.createSocket("udp4");

  client.on("error", (err) => {
    console.log(`server error:\n${err.stack}`);
    client.close();
  });

  const send = (topic: string, payload: string) => {
    const buff = new Buffer(topic);
    client.send(buff, payload, buff.length, port, host, function (err, bytes) {
      if (err) throw err;
      console.info(`UDP client message sent to -> ${topic} : ${port}`);
    });
  };

  const onMessage = (callback: (data: Buffer) => void) => {
    client.on("data", callback);
  };

  return { onMessage, send };
};

export default connect;