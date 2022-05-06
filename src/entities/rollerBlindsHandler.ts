import { RollerBlindHandler } from "../contracts";
import { ReceivedResponse, RequestIds } from "../lib/Global";
import { prePareAndValidateTopic } from "../utilities/utils";

export const rollerBlindsCommandsHandler = async ({
  mqttClient,
  hubs,
  mqttConfig,
}: RollerBlindHandler) => {
  return async (data: Buffer) => {
    const message = data.toString().replace(/\s/g, "");

    console.log("Response from server:", message);

    const index = RequestIds.indexOf(message);
    if (index > -1) {
      RequestIds.splice(index, 1); // 2nd parameter means remove one item only
    }

    const { blindName, position, action } = prePareAndValidateTopic(
      message,
      hubs
    );

    if (!blindName) {
      return console.error(
        `Can not continue!  bridge_address and motor_address not found! ${message}`
      );
    }

    ReceivedResponse.push(message);

    const unique_id = blindName;
    let positionSet: string = "0";
    switch (action) {
      case "o":
        positionSet = "0";
        break;
      case "s":
        positionSet = "50";
        break;
      case "m":
        positionSet = position;
        break;
      default:
        positionSet = "100";
        break;
    }

    const topic = `${mqttConfig.topic_prefix}/${unique_id}/position`;
    const payload = positionSet;
    console.info(`Blind-roller -> Publish: ${topic} : ${payload}`);
    mqttClient.onPublish(topic, payload);
  };
};
