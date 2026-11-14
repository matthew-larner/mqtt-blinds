import * as mqtt from "mqtt";
import * as logger from "../lib/logger/logger";

const connect = async (
  config: any,
  onConnected: (client: mqtt.MqttClient) => void | Promise<void>,
  initialHubTopics: string[] = []
) => {
  const availabilityTopic = config.availability_topic;
  const hubStates = new Map(initialHubTopics.map(topic => [topic, false] as [string, boolean]));
  const client = mqtt.connect(`mqtt://${config.broker}:${config.port}`, {
    username: config.username,
    password: config.password,
    will: { topic: availabilityTopic, payload: "offline", qos: 1, retain: true },
  });
  const publishAvailability = (topic: string, online: boolean) => {
    if (client.connected) client.publish(topic, online ? "online" : "offline", {
      qos: 1, retain: true,
    });
  };
  client.on("error", error => logger.error(`MQTT error: ${error.message}`));
  client.on("connect", () => {
    publishAvailability(availabilityTopic, true);
    hubStates.forEach((online, topic) => publishAvailability(topic, online));
    Promise.resolve(onConnected(client)).catch(error => {
      logger.error(`MQTT setup failed: ${error.message}`);
    });
  });
  client.on("close", () => logger.info("MQTT connection closed"));
  return {
    onMessage: (callback: mqtt.OnMessageCallback) => { client.on("message", callback); },
    onPublish: (topic: string, payload: string) => {
      client.publish(topic, payload, { qos: config.qos, retain: config.retain });
    },
    setHubAvailability: (topic: string, online: boolean) => {
      hubStates.set(topic, online);
      publishAvailability(topic, online);
    },
  };
};
export default connect;
