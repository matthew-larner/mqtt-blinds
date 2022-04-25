import * as mqtt from "mqtt";
import * as util from "../utils";
import {
  BlindRollerClient,
  Handler,
  IBlind,
  IHub,
  UdpClient,
} from "../../contracts";
import { preparePayload, toSnakeCase } from "../utils";
import * as logger from "../../lib/logger/logger";
import { commandTopic, setPositionTopic } from "./utilities";

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
                command_topic: `${mqttConfig.topic_prefix}/${blindName}/set`,
                position_topic: `${mqttConfig.topic_prefix}/${blindName}/position`,
                set_position_topic: `${mqttConfig.topic_prefix}/${blindName}/position/set`,
                schema: "json",
                availability_topic: `${mqttConfig.availability_topic}`,
                device_class: type == "blind" ? type : "awning",
                position_template: "{{value}}",
                payload_open: "open",
                payload_close: "close",
                position_open: 0,
                position_closed: 100,
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

    startupChannelPublish();
    subscribeTopics();
  };

export const homeAssistantCommandsHandler =
  async ({
    blindRollerClient,
    mqttConfig,
    hubs,
    mqttClient,
    udpClient,
  }: Handler) =>
  async (topic: string, message: Buffer) => {
    const res = await preparePayload(topic, message, hubs);

    const { payload, operation, blindsName, protocol } = res;

    const _topic = `${mqttConfig.topic_prefix}/${blindsName}/position`;

    if (!blindsName) {
      return;
    }

    const { hub, blind } = util.getRollerByName(hubs, blindsName);

    try {
      switch (operation) {
        case "setPositionTopic":
          setPositionTopic(
            hub,
            blind,
            blindRollerClient,
            _topic,
            payload,
            mqttClient,
            protocol,
            udpClient
          );
          break;
        case "commandTopic":
          commandTopic(
            hub,
            blind,
            blindRollerClient,
            _topic,
            payload,
            mqttClient,
            protocol,
            udpClient
          );
          break;
      }
    } catch (error) {
      console.error("Home assistant commandHandler error:", error);
    }
  };
