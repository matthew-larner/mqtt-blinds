import { Handler } from "../contracts";

import * as util from "./utils";
import { logger } from "./utils";

export const commandsHandler =
  ({ mqttClient, blindRollerClient, hub, mqttConfig }: Handler) =>
  (data: Buffer) => {
    logger.info(
      `ReceivedX mqtt-blind message:
     ${data.toString().replace(/\s/g, "")}`
    );

    if (!isValidCommand()) {
      throw new Error("Invalid Command");
    }

    console.log("SEND TCP COMMAND");
  };

const isValidCommand = () => {
  return true;
};
