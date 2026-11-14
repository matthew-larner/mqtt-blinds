import { Handler } from "../contracts";
import { setCommandTopic } from "./process";
import CommandQueue from "../lib/commandQueue";
import { toSnakeCase } from "../utilities/utils";

export const homeAssistantCommandsHandler = async (config: Handler) => {
  const queues = new Map<string, CommandQueue>();
  return async (topic: string, message: Buffer) => {
    // Ignore state and availability messages, including our own publications.
    const prefix = `${config.mqttConfig.topic_prefix}/`;
    if (!topic.startsWith(prefix)) return;
    const parts = topic.slice(prefix.length).split("/");
    const operation = parts.length === 2 && parts[1] === "set"
      ? "commandTopic"
      : parts.length === 3 && parts[1] === "position" && parts[2] === "set"
        ? "setPositionTopic" : null;
    if (!operation) return;
    const hub = config.hubs.find(h =>
      h.blinds.some(b => toSnakeCase(b.name) === parts[0]));
    if (!hub) return;
    const blind = hub.blinds.find(b => toSnakeCase(b.name) === parts[0]);
    const key = `${hub.protocol}:${hub.host}:${hub.port}`;
    if (!queues.has(key)) queues.set(key, new CommandQueue());
    try {
      await setCommandTopic(hub, blind, config.blindRollerClient,
        message.toString().trim(), hub.protocol, config.udpClient,
        config.hub_communication.timeout, operation, queues.get(key));
    } catch (error) {
      console.error(`Blind command failed for ${blind.name}: ${error.message}`);
    }
  };
};
