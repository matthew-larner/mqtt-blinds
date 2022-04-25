const connect = (host: string, port: number) => {
  var dgram = require("dgram");

  var client = dgram.createSocket("udp4");

  const onPublish = (topic: string, payload: string) => {
    const buff = new Buffer(topic);
    client.send(buff, payload, buff.length, port, host, function (err, bytes) {
      if (err) throw err;
      console.log(`UDP client message sent to -> ${topic} : ${port}`);
    });
  };

  const onMessage = (callback: (data: Buffer) => void) => {
    client.on("data", callback);
  };

  return { onMessage, onPublish };
};

export default connect;
