import * as mqtt from "mqtt";
import * as util from "./utils";
import { Handler } from "../contracts";
import { logger, toSnakeCase } from "./utils";

export const startup =
  ({ mqttConfig, hubs }) =>
  (client: mqtt.MqttClient) => {
    if (!mqttConfig.Discovery) {
      return console.warn(
        "MQTT Discovery is set to false: cannot go any further"
      );
    }
    const startupChannelPublish = () => {
      if (mqttConfig.discovery) {
        let sendOnce: number;
        let publish_topic: boolean;
        hubs.forEach((hub: any) => {
          sendOnce = 0;
          publish_topic = true;
          const { blinds } = hub;

          blinds.forEach((blind: any) => {
            const { type, name } = blind;
            const blindName = name;

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
                availability_topic: `${mqttConfig.availability_topic}`,
                device_class: type == "blind" ? type : "awning",
                payload_stop: type == "blind" ? null : "stop",
              };
            } else {
              // skip other types

              logger.info("Home Assistant Discovery skipping type:", type);
              return;
            }

            if (publish_topic) {
              logger.info(
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
          const { name } = blind;
          const blindName = toSnakeCase(name);

          let config_topic = `${mqttConfig.discovery_prefix}/cover/${blindName}/config`;
          let command_topic = `${mqttConfig.topic_prefix}/${blindName}/set`;
          let position_topic = `${mqttConfig.topic_prefix}/${blindName}/position`;
          let set_position_topic = `${mqttConfig.topic_prefix}/${blindName}/position/set`;
          let availability_topic = `${mqttConfig.availability_topic}`;

          const topics = [
            config_topic,
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
                logger.info("Subscribed to topic:", topic);
              }
            });
          });
        });
      });
    };

    startupChannelPublish();
    subscribeTopics();
  };

export const commandsHandler =
  ({ mqttClient, blindRollerClient, hub, bridge_address }: Handler) =>
  (topic: string, message: Buffer) => {
    const payload = message.toString().replace(/\s/g, "");

    const operation = topic.split("/")[topic.split("/").length - 1];

    try {
      /**
       * config_topic
command_topic
position_topic
set_position_topic
availability_topic
       */
      switch (operation) {
        case "set":
          setPositionTopic(hub, blindRollerClient, topic, payload);
          break;
        case "config":
          commandTopic(hub, blindRollerClient, topic, payload);
          break;
      }
    } catch (error) {
      console.error("Home assistant commandHandler error:", error);
    }
  };

const setPositionTopic = (
  hub: any,
  blindRollerClient: any,
  topic: string,
  payload: string
) => {
  const { blinds } = hub;
  const numberToSet: string = util.paddedNumber(parseInt(payload), 3);

  blinds.forEach((blind: any, i: number) => {
    // send TCP Command
    const command = `!${hub.bridge_address}${blind.motor_address}m${numberToSet};`;

    if (!isValidCommand(command)) {
      throw new Error("Invalid command format");
    }

    blindRollerClient.write(command, (err: any) => {
      sendMqttMessage(topic, command);
    });
  });
};

const isValidCommand = (command) => {
  return true;
};

const commandTopic = (
  hub: any,
  blindRollerClient: any,
  topic: string,
  payload: string
) => {
  const { blinds } = hub;
  const mess = payload === "open" ? "o" : payload === "close" ? "c" : "s";
  blinds.forEach((blind: any, i: number) => {
    // send TCP Command
    const command = `!${hub.bridge_address}${blind.motor_address}${mess}`;

    blindRollerClient.write(command, (err) => {
      sendMqttMessage(topic, mess);
    });
  });
};

const sendMqttMessage = (topic: string, message: string) => {};
