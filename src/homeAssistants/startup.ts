import * as logger from "../lib/logger/logger";
import { toSnakeCase } from "../utilities/utils";

export const startup =
  ({ mqttConfig, hubs }) =>
  async (client) => {
    const startupChannelPublish = async () => {
      if (mqttConfig.discovery) {
        let sendOnce: number;
        let publish_topic: boolean;
        for (let h = 0; h < hubs.length; h++) {
          sendOnce = 0;
          publish_topic = true;
          const { blinds } = hubs[h];
          for (let b = 0; b < blinds.length; b++) {
            const { type, name, reverse_direction } = blinds[b];
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
                schema: "json",
                availability_topic: `${mqttConfig.availability_topic}`,
                device_class: type == "blind" ? type : "awning",
                position_template: "{{value}}",
                payload_open: reverse_direction ? "close" : "open",
                payload_close: reverse_direction ? "open" : "close",
                position_open: reverse_direction ? 100 : 0,
                position_closed: reverse_direction ? 0 : 100,
                payload_stop: type == "blind" ? null : "stop",
              };
            } else {
              // skip other types
              logger.info(`Home Assistant Discovery skipping type: ${type}`);
              return;
            }

            if (publish_topic) {
              logger.info(
                `Sending payload: ${JSON.stringify(
                  payload
                )} to topic: ${topic} `
              );

              const result = await client.publish(
                topic,
                JSON.stringify(payload),
                {
                  qos: mqttConfig.qos,
                  retain: mqttConfig.retain,
                }
              );
            }
          }
        }
      }
    };

    const subscribeTopics = () => {
      hubs.forEach((hub) => {
        const { blinds } = hub;
        blinds.forEach((blind) => {
          const { name, motor_address } = blind;
          const blindName = toSnakeCase(name);
          let command_topic = `${mqttConfig.topic_prefix}/${blindName}/set`;
          let position_topic = `${mqttConfig.topic_prefix}/${blindName}/position`;
          let set_position_topic = `${mqttConfig.topic_prefix}/${blindName}/position/set`;
          let availability_topic = `${mqttConfig.availability_topic}`;
          const topics = [
            command_topic,
            position_topic,
            set_position_topic,
            availability_topic,
          ];
          topics.forEach((topic) => {
            client.subscribe(topic, (err) => {
              if (err) {
                logger.info(`Cannot subscribe to topic ${topic}: ${err}`);
              } else {
                logger.info(`Subscribed to topic: ${topic}`);
              }
            });
          });
        });
      });
    };
    await startupChannelPublish();
    subscribeTopics();
  };
