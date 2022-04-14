import * as mqtt from "mqtt";
import * as logger from "../lib/logger/logger";

var availabilityTopic: string;
const connect = (
  config: any,
  onConnected: (client: mqtt.MqttClient) => void
) => {
  if (!config.availability_topic) {
    availabilityTopic = "mqtt-blind/available";
    console.warn("availability_topic is empty");
  } else {
    availabilityTopic = config.availability_topic;
  }
  const client = mqtt.connect(
    `mqtt://${config.username}:${config.password}@${config.broker}:${config.port}`,
    {
      will: {
        topic: availabilityTopic,
        payload: "offline",
        qos: 1,
        retain: true,
      },
    }
  );

  client.on("error", (err) => {
    logger.error(`Mqtt error: ${err.message}`);
  });

  client.on("connect", () => {
    logger.info("Connected to mqtt");
    onPublish(availabilityTopic, "online");
    onConnected(client);
  });

  client.on("close", () => {
    logger.info("Mqtt connection closed");
    onPublish(availabilityTopic, "offline");
  });

  const onMessage = (callback: mqtt.OnMessageCallback) => {
    client.on("message", callback);
  };

  const onPublish = (topic: string, payload: string) => {
    logger.info(`Sending payload: ${payload} to topic: ${topic}`);
    client.publish(topic, payload, {
      qos: config.qos,
      retain: config.retain,
    });
  };

  return {
    onMessage,
    onPublish,
  };
};

export default connect;
