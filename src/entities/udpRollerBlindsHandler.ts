import { RollerBlindHandler } from "../contracts";
import { rollerBlindsCommandsHandler } from "./rollerBlindsHandler";
import { createFrameDecoder } from "./rollerBlinds";

export const udpRollerBlindsCommandsHandler = async (config: RollerBlindHandler) => {
  const handle = await rollerBlindsCommandsHandler(config);
  return (data: Buffer) => createFrameDecoder(handle)(data);
};
