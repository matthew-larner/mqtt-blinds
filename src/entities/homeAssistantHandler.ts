import * as mqtt from "mqtt";

import { Handler } from "../contracts";

let mqttConfigGlobal: any;
export const startup =
  ({ mqttConfig, hubs }) =>
  (client: mqtt.MqttClient) => {
    const startupChannelPublish = () => {
      mqttConfigGlobal = mqttConfig;
      if (mqttConfig.discovery) {
        let sendOnce: number;
        let publish_topic: boolean;
        hubs.forEach((areaKey) => {
          sendOnce = 0;
          publish_topic = true;
          const channelKeys = areaKey.blinds;
          channelKeys.forEach((channelKey) => {
            const { type, name: channelName } = channelKey;

            let payload: object;
            let topic: string;
            if (type === "blind" || type === "curtain") {
              topic = `${mqttConfig.discovery_prefix}/${type}/${channelName}`;
              payload = {
                name: `${type} ${channelName}`,
                device_class: type,
                state_topic: `${mqttConfig.topic_prefix}/${type}c${channelName}/state`,
                availabilityTopic: `${mqttConfig.availabilityTopic}`,
              };
            } else {
              // skip other types
              console.log("Home Assistant Discovery skipping type:", type);
              return;
            }

            if (publish_topic) {
              console.log(
                `Sending payload: ${JSON.stringify(
                  payload
                )} to topic: ${topic} `
              );
              client.publish(topic, JSON.stringify(payload), {
                qos: mqttConfig.qos,
                retain: mqttConfig.retain,
              });
            }
          });
        });
      }
    };

    const subscribeTopics = () => {
      const areaKeys = hubs;

      areaKeys.forEach((areaKey) => {
        const channelKeys = areaKey.blinds;
        channelKeys.forEach((channelKey) => {
          const topic = `${mqttConfig.topic_prefix}/a${areaKey}c${channelKey}/set`;

          client.subscribe(topic, (err) => {
            if (err) {
              console.log(`Cannot subscribe to topic ${topic}: ${err}`);
            } else {
              console.log("Subscribed to topic:", topic);
            }
          });
        });
      });
    };

    startupChannelPublish();
    subscribeTopics();
  };

export const commandsHandler =
  ({}: Handler) =>
  (topic: string, message: Buffer) => {
    try {
      console.log(
        "Topic:",
        topic,
        "Received message: ",
        message.toString().replace(/\s/g, "")
      );
    } catch (error) {
      console.error("Home assistant commandHandler error:", error);
    }
  };
