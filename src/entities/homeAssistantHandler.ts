import * as mqtt from "mqtt";
import * as util from "./utils";
import { BlindRollerClient, Handler, IBlind, IHub } from "../contracts";
import { getKeys, getRoller, logger, toSnakeCase } from "./utils";

export const startup =
  ({ mqttConfig, hubs }) =>
  (client: mqtt.MqttClient) => {
    // prepare initial topic and subscription
    const startupChannelPublish = () => {
      if (mqttConfig.discovery) {
        let sendOnce: number;
        let publish_topic: boolean;
        hubs.forEach((hub: IHub) => {
          sendOnce = 0;
          publish_topic = true;
          const { blinds } = hub;

          blinds.forEach((blind: IBlind) => {
            const { type, name } = blind;
            const blindName = toSnakeCase(name);

            let payload: object;
            let topic: string;

            if (type === "blind" || type === "curtain") {
              topic = `${mqttConfig.discovery_prefix}/cover/${blindName}/config`;

              payload = {
                name: `${name}`,
                unique_id: blindName,
                command_topic: `${hub.bridge_address}/${blind.motor_address}/${mqttConfig.topic_prefix}/${blindName}/set`,
                position_topic: `${hub.bridge_address}/${blind.motor_address}/${mqttConfig.topic_prefix}/${blindName}/position`,
                set_position_topic: `${hub.bridge_address}/${blind.motor_address}/${mqttConfig.topic_prefix}/${blindName}/position/set`,
                availability_topic: `${hub.bridge_address}/${blind.motor_address}/${mqttConfig.availability_topic}`,
                device_class: type == "blind" ? type : "awning",
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
              client.publish(topic, JSON.stringify(payload), {
                qos: mqttConfig.qos,
                retain: mqttConfig.retain,
              });
            }
          });
        });
      }
    };

    // prepare all subscription
    const subscribeTopics = () => {
      hubs.forEach((hub: IHub) => {
        const { blinds } = hub;
        blinds.forEach((blind: IBlind) => {
          const { name, motor_address } = blind;
          const blindName = toSnakeCase(name);

          let config_topic = `${hub.bridge_address}/${motor_address}/${mqttConfig.discovery_prefix}/cover/${blindName}/config`;
          let command_topic = `${hub.bridge_address}/${motor_address}/${mqttConfig.topic_prefix}/${blindName}/set`;
          let position_topic = `${hub.bridge_address}/${motor_address}/${mqttConfig.topic_prefix}/${blindName}/position`;
          let set_position_topic = `${hub.bridge_address}/${motor_address}/${mqttConfig.topic_prefix}/${blindName}/position/set`;
          let availability_topic = `${hub.bridge_address}/${motor_address}/${mqttConfig.availability_topic}`;

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
                logger.info(`Subscribed to topic: ${topic}`);
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
  ({ mqttClient, blindRollerClient: allBlindRollerClient, hubs }: Handler) =>
  (topic: string, message: Buffer) => {
    const { payload, address, operation, motor } = getKeys(topic, message);

    const blindRollerClient = allBlindRollerClient[address];
    const { hub, blind } = getRoller(hubs, address, motor);

    try {
      switch (operation) {
        case "set":
          setPositionTopic(hub, blind, blindRollerClient, topic, payload);
          break;
        case "config":
          commandTopic(hub, blind, blindRollerClient, topic, payload);
          break;
      }
    } catch (error) {
      console.error("Home assistant commandHandler error:", error);
    }
  };

// prepare and send TCP command for set topic
const setPositionTopic = (
  hub: IHub,
  blind: IBlind,
  blindRollerClient: BlindRollerClient,
  topic: string,
  payload: string
) => {
  const num = parseInt(payload);

  if (isNaN(num)) {
    return logger.error("not a number");
  }
  const numberToSet: string = util.paddedNumber(parseInt(payload), 3);

  // send TCP Command
  const command = `!${hub.bridge_address}${blind.motor_address}m${numberToSet};`;

  blindRollerClient.write(command, (err: any) => {
    sendMqttMessage(topic, command);
  });
};

// prepare and send TCP command for config topic
const commandTopic = (
  hub: IHub,
  blind: IBlind,
  blindRollerClient: BlindRollerClient,
  topic: string,
  payload: string
) => {
  const validPayload = ["open", "close", "stop"];
  if (!validPayload.includes(payload)) {
    return logger.error('Only allowed: "open", "close", "stop"');
  }

  const mess = payload === "open" ? "o" : payload === "close" ? "c" : "s";

  // send TCP Command
  const command = `!${hub.bridge_address}${blind.motor_address}${mess}`;

  blindRollerClient.write(command, (err) => {
    sendMqttMessage(topic, mess);
  });
};

// to be use if need to publish a message
const sendMqttMessage = (topic: string, message: string) => {};
