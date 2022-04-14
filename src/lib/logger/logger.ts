import { LogType } from "../../contracts";

export const info = (message: string | object) => {
  console.info(getMessagesBasedOnLogType(LogType.INFO, message));
};

export const warn = (message: string | object) => {
  console.warn(getMessagesBasedOnLogType(LogType.WARN, message));
};

export const error = (message: string | object) => {
  console.error(getMessagesBasedOnLogType(LogType.ERROR, message));
};

/**
 * Takes either a string or a JSON object. And prepends [INFO]: to the message.
 * If the input is a string it will be places within a JSON object in the Message property.
 */
const getMessagesBasedOnLogType = (
  logType: LogType,
  message: string | object
): string => {
  return typeof message === "string"
    ? `[${logType}]: ${JSON.stringify({ Message: message }, null, 4)}`
    : `[${logType}]: ${JSON.stringify(message, null, 4)}`;
};
