import { RollerBlindHandler } from "../contracts";
import { parseBlindResponse } from "../utilities/utils";

export const rollerBlindsCommandsHandler = async ({
  mqttClient, hubs, mqttConfig,
}: RollerBlindHandler) => (data: Buffer) => {
  const message = data.toString().replace(/\s/g, "");
  const response = parseBlindResponse(message, hubs);
  if (!response) return;
  const topic = `${mqttConfig.topic_prefix}/${response.blindName}/position`;
  console.info(`Blind position: ${topic} = ${response.position}`);
  mqttClient.onPublish(topic, response.position);
};
