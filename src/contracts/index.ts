import { OnMessageCallback } from "mqtt";

export interface IBlind {
  name: string;
  type: string;
  motor_address: string;
  reverse_direction: boolean;
}

export interface IHub {
  host: string;
  port: number;
  type: string;
  protocol: string;
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

export interface UdpClient {
  onMessage: (callback: (data: Buffer) => void) => void;
  send: (data: any, cb?: (error?: Error) => void) => void;
}

export interface IHub_communication {
  async: boolean;
  timeout: number;
}

export interface Handler {
  blindRollerClient: BlindRollerClient[];
  mqttConfig: any;
  hubs: any;
  mqttClient: MqttClient;
  udpClient: UdpClient[];
  hub_communication: IHub_communication;
}

export interface RollerBlindHandler {
  mqttClient: MqttClient;
  hubs: any;
  mqttConfig: any;
}

export enum LogType {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}
