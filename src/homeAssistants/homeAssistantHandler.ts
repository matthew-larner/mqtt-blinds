import { commandTopic, setPositionTopic } from "./process";
import { Handler } from "../contracts";
import Queue from "../lib/queue";
import { getRollerByName, preparePayload } from "../utilities/utils";

const topicQueue = new Queue();

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
    const { async: isAsync, timeout: _timeout } = hub_communication;
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
      if (isAsync) await stall(timeout / 2);
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

      const { hub, blind } = getRollerByName(hubs, blindsName);

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
              udpClient,
              isAsync,
              _timeout
            );
            break;

          case "commandTopic":
            const response = await commandTopic(
              hub,
              blind,
              blindRollerClient,
              topic,
              payload,
              mqttClient,
              protocol,
              udpClient,
              isAsync,
              _timeout
            );
            return response;
        }
      } catch (error) {
        console.error("Home assistant commandHandler error:", error);
      }
    };

    if (allTopic.length > 0) {
      for (let i = 0; i < allTopic.length; i++) {
        await runProcess(allTopic[i]);
      }
    }
  };

async function stall(stallTime = 3000) {
  await new Promise((resolve) => setTimeout(resolve, stallTime));
}
