import * as dgram from "dgram";

const connect = async (host: string, port: number) => {
  const client = dgram.createSocket("udp4");
  client.on("error", error => console.error(`UDP controller error: ${error.message}`));
  const send = (command: string): Promise<void> => new Promise((resolve, reject) => {
    const buffer = Buffer.from(command, "utf8");
    client.send(buffer, port, host, error => error ? reject(error) : resolve());
  });
  return {
    send,
    onMessage: (callback: (data: Buffer) => void) => { client.on("message", callback); },
  };
};
export default connect;
