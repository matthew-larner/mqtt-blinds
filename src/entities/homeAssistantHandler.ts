import * as mqtt from "mqtt";

import { Handler } from "../contracts";
import { toSnakeCase } from "./utils";

let mqttConfigGlobal: any;
export const startup =
  ({ mqttConfig, hubs }) =>
  (client: mqtt.MqttClient) => {
    const startupChannelPublish = () => {
      mqttConfigGlobal = mqttConfig;
      if (mqttConfig.discovery) {
        let sendOnce: number;
        let publish_topic: boolean;
        hubs.forEach((hub: any) => {
          sendOnce = 0;
          publish_topic = true;
          const { blinds } = hub;
          blinds.forEach((blind: any) => {
            const { type, name } = blind;
            const blindName = toSnakeCase(name);
            let payload: object;
            let topic: string;

            if (type === "blind" || type === "curtain") {
              topic = `${mqttConfig.discovery_prefix}/cover/${blindName}/config`;

              payload = {
                name: `${name}`,
                unique_id: blindName,
                command_topic: `${mqttConfig.topic_prefix}/${blindName}/set`,
                position_topic: `${mqttConfig.topic_prefix}/${blindName}/position`,
                set_position_topic: `${mqttConfig.topic_prefix}/${blindName}/position/set`,
                availability_topic: `${mqttConfig.topic}`,
                device_class: type == "blind" ? type : "awning",
                payload_stop: type == "blind" ? null : "stop",
              };
            } else {
              // skip other types
              console.info("Home Assistant Discovery skipping type:", type);
              return;
            }

            if (publish_topic) {
              console.info(
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
      hubs.forEach((hub) => {
        const { blinds } = hub;
        blinds.forEach((blind) => {
          // TODO: to be replace by required topic
          let topic = `${mqttConfig.topic_prefix}/a${hub}c${blind}/set`;
          topic = `office/door/lock`;
          client.subscribe(topic, (err) => {
            if (err) {
              console.info(`Cannot subscribe to topic ${topic}: ${err}`);
            } else {
              console.info("Subscribed to topic:", topic);
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
      console.info(
        "Topic:",
        topic,
        "Received message: ",
        message.toString().replace(/\s/g, "")
      );
      // TODO: other required process will be place here
    } catch (error) {
      console.error("Home assistant commandHandler error:", error);
    }
  };
