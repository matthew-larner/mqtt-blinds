import { IHub, IBlind, BlindRollerClient, UdpClient } from "../contracts";
import CommandQueue from "../lib/commandQueue";
import { paddedNumber } from "../utilities/utils";

export const setCommandTopic = async (
  hub: IHub, blind: IBlind, blindRollerClient: { [key: string]: BlindRollerClient },
  payload: string, protocol: string,
  udpClient: { [key: string]: UdpClient }, timeout: number,
  operation: string, queue: CommandQueue
): Promise<void> => {
  const address = `${hub.bridge_address}${blind.motor_address}`;
  let command: string;
  if (operation === "commandTopic") {
    const actions = { open: "o", close: "c", stop: "s" };
    const normalized = payload.toLowerCase();
    if (!["open", "close", "stop"].includes(normalized)) {
      throw new Error("Only open, close and stop commands are allowed");
    }
    const action = actions[normalized];
    command = `!${address}${action};`;
  } else {
    if (!/^\d{1,3}$/.test(payload) || Number(payload) > 100) {
      throw new Error("Position must be a whole number between 0 and 100");
    }
    command = `!${address}m${paddedNumber(Number(payload), 3)};`;
  }
  const timeoutMs = Number.isFinite(timeout) && timeout > 0 ? timeout * 1000 : 10000;
  const key = `${hub.host}:${hub.port}`;
  const send = protocol.toLowerCase() === "tcp"
    ? (wait: number) => blindRollerClient[key].write(command, wait)
    : protocol.toLowerCase() === "udp"
      ? () => udpClient[key].send(command)
      : null;
  if (!send) throw new Error(`Unsupported protocol: ${protocol}`);
  await queue.enqueue(send, `${blind.name}: ${payload}`, timeoutMs);
};
