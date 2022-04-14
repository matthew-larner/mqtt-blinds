import { OnMessageCallback } from "mqtt";

export interface IBlind {
  name: string;
  type: string;
  motor_address: string;
}

export interface IHub {
  host: string;
  port: number;
  type: string;
  bridge_address: string;
  blinds: IBlind[];
  reconnectTime?: number;
  autoReconnectTime?: number;
}

export interface MqttClient {
  onMessage: (callback: OnMessageCallback) => void;
  onPublish: (topic: string, payload: string) => void;
}

export interface BlindRollerClient {
  onMessage: (callback: (data: Buffer) => void) => void;
  write: (data: any, cb?: (error?: Error) => void) => void;
}

export interface Handler {
  mqttClient: MqttClient;
  blindRollerClient: BlindRollerClient[];
  hubs?: any;
  mqttConfig?: any;
  bridge_address?: any;
}

export enum LogType {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}
