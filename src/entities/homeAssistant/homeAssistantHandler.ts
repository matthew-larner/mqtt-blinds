import * as mqtt from "mqtt";
import * as util from "../utils";
import { Handler, IBlind, IHub } from "../../contracts";
import { preparePayload, toSnakeCase } from "../utils";
import * as logger from "../../lib/logger/logger";
import { commandTopic, setPositionTopic } from "./utilities";
import Queue from "../../lib/queue";
const topicQueue = new Queue();
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
            const { type, name, reverse_direction } = blind;
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
    hub_communication,
  }: Handler) =>
  async (topic: string, message: Buffer) => {
    const res = await preparePayload(topic, message, hubs);

    const { payload, operation, blindsName, protocol } = res;
    const { async, timeout: _timeout } = hub_communication;
    const timeout = _timeout * 1000;

    const _topic = `${mqttConfig.topic_prefix}/${blindsName}/position`;

    let allTopic = [];
    let next = false;

    // waiting time for queuing is the timeout time
    do {
      if (_topic !== "mqtt-blinds/null/position") {
        console.info(`-> Enqueue : ${_topic} : ${payload}`);
        await topicQueue.topicOnQueue({
          payload,
          operation,
          blindsName,
          protocol,
        });
      }
      if (async) await stall(timeout);
      next = true;
    } while (!next);
    next = false;
    allTopic = await topicQueue.getTopicsQueue();
    await topicQueue.clearQueue();

    const runProcess = async (topic) => {
      const { payload, operation, blindsName, protocol } = topic;
      if (!blindsName) {
        return;
      }

      const { hub, blind } = util.getRollerByName(hubs, blindsName);

      try {
        switch (operation) {
          case "setPositionTopic":
            await setPositionTopic(
              hub,
              blind,
              blindRollerClient,
              topic,
              payload,
              mqttClient,
              protocol,
              udpClient
            );
            break;
          case "commandTopic":
            await commandTopic(
              hub,
              blind,
              blindRollerClient,
              topic,
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

    (async () => {
      for (let i = 0; i < allTopic.length; i++) {
        await runProcess(allTopic[i]);
        if (async) await stall(timeout);
      }
    })();

    return;
  };

export const syncHomeAssistantCommandsHandler =
  ({ blindRollerClient, mqttConfig, hubs, mqttClient, udpClient }: Handler) =>
  (topic: string, message: Buffer) => {
    preparePayload(topic, message, hubs).then((res: any) => {
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
    });
  };

async function stall(stallTime = 3000) {
  await new Promise((resolve) => setTimeout(resolve, stallTime));
}
