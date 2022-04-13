import { Handler } from "../contracts";

import * as util from "./utils";
import { logger } from "./utils";

export const commandsHandler =
  ({ mqttClient, blindRollerClient, hubs, mqttConfig }: Handler) =>
  (data: Buffer) => {
    const message = data.toString().replace(/\s/g, "");
    const bridge_address = message.substring(1, 4);
    const motor_address = message.substring(4, 7);
    const action = message.substring(7, 8);
    const position = message.substring(8, 11);

    const { hub, blind } = util.getRoller(hubs, bridge_address, motor_address);

    if (!hub || !blind) {
      throw new Error("Invalid Command");
    }

    const unique_id = util.toSnakeCase(blind.name);
    let positionSet: string = "0";
    switch (action) {
      case "o":
        positionSet = "100";
        break;
      case "s":
        positionSet = "50";
        break;
      case "m":
        positionSet = position;
        break;
      default:
        positionSet = "0";
        break;
    }

    const topic = `${mqttConfig.topic_prefix}/${unique_id}/${positionSet}`;
    const payload = {
      position: positionSet,
    };
    mqttClient.onPublish(topic, JSON.stringify(payload));
  };
