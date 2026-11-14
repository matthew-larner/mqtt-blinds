const assert = require('assert');
const { EventEmitter } = require('events');
const CommandQueue = require('../dist/lib/commandQueue').default;
const tcp = require('../dist/entities/rollerBlinds');
const { homeAssistantCommandsHandler } = require('../dist/homeAssistants/homeAssistantHandler');
const { rollerBlindsCommandsHandler } = require('../dist/entities/rollerBlindsHandler');
const { startup } = require('../dist/homeAssistants/startup');
const { hubAvailabilityTopic } = require('../dist/utilities/utils');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const tests = [];
const test = (name, run) => tests.push({ name, run });
const mqttConfig = { topic_prefix: 'mqtt-blinds', availability_topic: 'mqtt-blinds/available',
  discovery_prefix: 'homeassistant', discovery: true, qos: 1, retain: true };
const hub = { host: 'controller', port: 1487, protocol: 'tcp', bridge_address: '',
  blinds: Array.from({ length: 9 }, (_, i) => ({ name: `Blind ${i}`, motor_address: `B${i}`,
    type: 'blind', reverse_direction: false })) };

class Socket extends EventEmitter {
  constructor(number, behavior) { super(); this.number = number; this.behavior = behavior; }
  setKeepAlive() {}
  setNoDelay() {}
  connect() { setTimeout(() => { if (!this.destroyed) this.emit('connect'); }, 1); }
  write(data, callback) { this.behavior(this, data, callback); return true; }
  destroy(error) {
    if (this.destroyed) return;
    this.destroyed = true;
    setTimeout(() => {
      if (error) this.emit('error', error);
      this.emit('close');
    }, 0);
  }
}

test('nine simultaneous commands are sent exactly once, in order', async () => {
  const sent = [];
  let active = 0, peak = 0;
  const client = { write: async command => {
    peak = Math.max(peak, ++active);
    await delay(1); sent.push(command); active--;
  } };
  const handler = await homeAssistantCommandsHandler({ blindRollerClient: { 'controller:1487': client },
    udpClient: {}, mqttConfig, hubs: [hub], mqttClient: {},
    hub_communication: { async: true, timeout: 1 } });
  await Promise.all(hub.blinds.map((blind, i) => handler(`mqtt-blinds/blind_${i}/set`, Buffer.from('open'))));
  assert.deepStrictEqual(sent, hub.blinds.map(blind => `!${blind.motor_address}o;`));
  assert.strictEqual(peak, 1);
  await handler('mqtt-blinds/blind_0/position', Buffer.from('0'));
  await handler('mqtt-blinds/available', Buffer.from('online'));
  assert.strictEqual(sent.length, 9);
  await handler('mqtt-blinds/blind_0/position/set', Buffer.from('50'));
  assert.strictEqual(sent[9], '!B0m050;');
});

test('queue retries failures but does not block later commands permanently', async () => {
  const queue = new CommandQueue();
  let attempts = 0;
  await queue.enqueue(async () => { if (++attempts < 3) throw new Error('disconnected'); }, 'retry');
  assert.strictEqual(attempts, 3);
  await assert.rejects(queue.enqueue(async () => { throw new Error('offline'); }, 'failed'), /offline/);
  let next = false;
  await queue.enqueue(async () => { next = true; }, 'next');
  assert(next);
});

test('expired commands are never sent', async () => {
  let sent = false;
  await assert.rejects(new CommandQueue().enqueue(async () => { sent = true; }, 'stale', 10, 0), /expired/);
  assert.strictEqual(sent, false);
});

test('commands that expire behind a blocked command are not sent', async () => {
  const originalNow = Date.now;
  let now = originalNow();
  Date.now = () => now;
  let release, sent = false;
  const queue = new CommandQueue();
  try {
    const first = queue.enqueue(() => new Promise(resolve => { release = resolve; }), 'first');
    await Promise.resolve();
    const expired = queue.enqueue(async () => { sent = true; }, 'waiting', 100, 5);
    const rejected = assert.rejects(expired, /expired/);
    now += 10;
    release();
    await first; await rejected;
    assert.strictEqual(sent, false);
  } finally { Date.now = originalNow; }
});

test('separate controllers with empty bridge addresses have independent queues', async () => {
  const hubs = [Object.assign({}, hub, { host: 'first', blinds: [hub.blinds[0]] }),
    Object.assign({}, hub, { host: 'second', blinds: [hub.blinds[1]] })];
  let release, secondSent = false;
  const handler = await homeAssistantCommandsHandler({
    blindRollerClient: {
      'first:1487': { write: () => new Promise(resolve => { release = resolve; }) },
      'second:1487': { write: async () => { secondSent = true; } },
    }, udpClient: {}, mqttConfig, hubs, mqttClient: {},
    hub_communication: { async: false, timeout: 1 },
  });
  const first = handler('mqtt-blinds/blind_0/set', Buffer.from('open'));
  await handler('mqtt-blinds/blind_1/set', Buffer.from('close'));
  assert(secondSent);
  release(); await first;
});

test('UDP sends to the configured port and exposes asynchronous errors', async () => {
  const dgram = require('dgram');
  const original = dgram.createSocket;
  const socket = new EventEmitter();
  let fail = false, sent;
  socket.send = (buffer, port, host, callback) => {
    sent = [buffer.toString(), port, host];
    callback(fail ? new Error('UDP send failed') : null);
  };
  dgram.createSocket = () => socket;
  try {
    const client = await require('../dist/entities/udp').default('controller', 1487);
    await client.send('!ABCo;');
    assert.deepStrictEqual(sent, ['!ABCo;', 1487, 'controller']);
    fail = true;
    await assert.rejects(client.send('!ABCo;'), /UDP send failed/);
  } finally { dgram.createSocket = original; }
});

test('TCP reconnects and retries after reset even after the write callback succeeds', async () => {
  const writes = [], statuses = [];
  let count = 0;
  const client = await tcp.default('test', 1, 0.002, () => new Socket(++count, (socket, data, callback) => {
    writes.push([socket.number, data]);
    callback();
    if (socket.number === 1) setTimeout(() => socket.destroy(new Error('ECONNRESET')), 2);
    else setTimeout(() => socket.emit('data', Buffer.from(data.replace(';', ',R7D;'))), 1);
  }));
  client.onStatus(online => statuses.push(online));
  try {
    await new CommandQueue().enqueue(wait => client.write('!ABCo;', wait), 'open', 1000);
    assert.deepStrictEqual(writes, [[1, '!ABCo;'], [2, '!ABCo;']]);
    assert(statuses.includes(false));
    assert.strictEqual(statuses[statuses.length - 1], true);
  } finally { client.close(); }
});

test('TCP waits for acknowledgement, ignores unrelated reports, and times out', async () => {
  const client = await tcp.default('test', 1, 0.002, () => new Socket(1, (socket, data, callback) => {
    callback();
    setTimeout(() => socket.emit('data', Buffer.from('!OTHERr000b000,R1;')), 1);
  }));
  try { await assert.rejects(client.write('!ABCo;', 100), /acknowledgement timed out/); }
  finally { client.close(); }
});

test('TCP waits for connection readiness rather than writing to a closed socket', async () => {
  let wrote = false;
  const client = await tcp.default('test', 1, 0.002, () => {
    const socket = new Socket(1, () => { wrote = true; });
    socket.connect = () => {};
    return socket;
  });
  try { await assert.rejects(client.write('!ABCo;', 10), /waiting for blind controller/); }
  finally { client.close(); }
  assert.strictEqual(wrote, false);
});

test('split and combined replies update every blind with reported positions only', async () => {
  const published = [];
  const handle = await rollerBlindsCommandsHandler({ hubs: [hub], mqttConfig,
    mqttClient: { onPublish: (topic, payload) => published.push([topic, payload]) } });
  const decode = tcp.createFrameDecoder(handle);
  decode(Buffer.from('!B0r0'));
  assert.strictEqual(published.length, 0);
  decode(Buffer.from('00b000,R7D;!B1r100b180,R76;!B2s;!B3o;!B4pVc01107,R62;!B5m075,R74;'));
  assert.deepStrictEqual(published, [
    ['mqtt-blinds/blind_0/position', '000'], ['mqtt-blinds/blind_1/position', '100']]);
  assert(tcp.isCommandResponse('!NOCo;', '!NOCo,R7D;'));
  assert(tcp.isCommandResponse('!NOCc;', '!NOCc,R70;'));
  assert(tcp.isCommandResponse('!NOCm075;', '!NOCm075,R74;'));
  assert(tcp.isCommandResponse('!B0o;', '!B0r000b000,R7D;'));
  assert(!tcp.isCommandResponse('!B0o;', '!B0r100b000,R7D;'));
  assert(!tcp.isCommandResponse('!B0o;', '!B1r000b000,R7D;'));
});

test('MQTT discovery requires both broker and TCP controller availability', async () => {
  const configs = [];
  await startup({ mqttConfig, hubs: [hub] })({
    publish: (topic, payload) => configs.push(JSON.parse(payload)),
    subscribe: (topic, callback) => callback(),
  });
  assert.strictEqual(configs.length, 9);
  assert.strictEqual(configs[0].availability_mode, 'all');
  assert.deepStrictEqual(configs[0].availability, [
    { topic: mqttConfig.availability_topic }, { topic: hubAvailabilityTopic(mqttConfig, hub) }]);
  assert(!('availability_topic' in configs[0]));
});

test('MQTT retains current controller status and republishes it on reconnect', async () => {
  const mqtt = require('mqtt');
  const original = mqtt.connect;
  const broker = new EventEmitter();
  const published = [];
  let options;
  broker.connected = false;
  broker.publish = (topic, payload, opts) => published.push({ topic, payload, opts });
  mqtt.connect = (url, opts) => { options = opts; return broker; };
  try {
    const connect = require('../dist/entities/mqtt').default;
    const topic = hubAvailabilityTopic(mqttConfig, hub);
    const client = await connect(Object.assign({ broker: 'test', port: 1883 }, mqttConfig), () => {}, [topic]);
    broker.connected = true; broker.emit('connect');
    assert(published.some(p => p.topic === topic && p.payload === 'offline'));
    client.setHubAvailability(topic, true);
    assert.strictEqual(published[published.length - 1].payload, 'online');
    broker.connected = false; broker.emit('close');
    const before = published.length;
    client.setHubAvailability(topic, false);
    assert.strictEqual(published.length, before);
    broker.connected = true; broker.emit('connect');
    assert.strictEqual(published[published.length - 1].payload, 'offline');
    assert.strictEqual(published[published.length - 1].opts.retain, true);
    assert.strictEqual(options.will.payload, 'offline');
    assert.strictEqual(options.will.retain, true);
  } finally { mqtt.connect = original; }
});

(async () => {
  for (const { name, run } of tests) {
    await run();
    console.log(`PASS ${name}`);
  }
  console.log(`${tests.length} regression tests passed`);
})().catch(error => { console.error(error); process.exitCode = 1; });
