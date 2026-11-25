import { createHash } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { parseJson, toRecord, toText, type Json } from "./json";

const HANDSHAKE_KEY = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const TEXT_FRAME = 1;
const CLOSE_FRAME = 8;

export type Signal = {
  readonly topic: string;
  readonly event: string;
  readonly payload: unknown;
};

type Message = {
  readonly joinRef: unknown;
  readonly ref: unknown;
  readonly topic: string;
  readonly event: string;
  readonly payload: unknown;
};

/** Realtime のうち、非公開チャンネルで合図を受け取る部分だけをまねる。 */
export class FakeRealtime {
  private readonly clients = new Set<Client>();
  /** true の間は、つながせない。 */
  isDown = false;

  constructor(private readonly verifyToken: (token: string) => string | null) {}

  accept(request: IncomingMessage, socket: Duplex): void {
    if (this.isDown) {
      socket.destroy();
      return;
    }
    const accept = createHash("sha1")
      .update(`${request.headers["sec-websocket-key"]}${HANDSHAKE_KEY}`)
      .digest("base64");
    socket.write(
      [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${accept}`,
        "\r\n",
      ].join("\r\n"),
    );
    const isVersion2 = (request.url ?? "").includes("vsn=2.0.0");
    const client = new Client(socket, isVersion2, (message) =>
      this.receive(client, message),
    );
    this.clients.add(client);
    const forget = () => this.clients.delete(client);
    socket.on("close", forget);
    socket.on("error", forget);
  }

  broadcast({ topic, event, payload }: Signal): void {
    const name = `realtime:${topic}`;
    for (const client of this.clients) {
      if (!client.joined.has(name)) continue;
      client.send({
        joinRef: client.joined.get(name),
        ref: null,
        topic: name,
        event: "broadcast",
        payload: { type: "broadcast", event, payload },
      });
    }
  }

  dropAll(): void {
    for (const client of this.clients) client.destroy();
  }

  private receive(client: Client, message: Message): void {
    const { joinRef, topic, event, payload } = message;
    const reply = (status: "ok" | "error", response: Json) =>
      client.send({ ...message, event: "phx_reply", payload: { status, response } });

    if (event === "heartbeat") reply("ok", {});
    if (event === "phx_leave") {
      client.joined.delete(topic);
      reply("ok", {});
    }
    if (event === "phx_join") {
      const fields = toRecord(payload);
      const isPrivate = toRecord(fields.config).private === true;
      const userId = this.verifyToken(toText(fields.access_token));
      if (!isPrivate || userId === null || topic !== `realtime:notes:${userId}`) {
        reply("error", { reason: "Unauthorized" });
        return;
      }
      client.joined.set(topic, joinRef);
      reply("ok", { postgres_changes: [] });
    }
  }
}

/** 1つのWebSocket。短い文字のやりとりだけを扱う。 */
class Client {
  readonly joined = new Map<string, unknown>();
  private buffer = Buffer.alloc(0);

  constructor(
    private readonly socket: Duplex,
    private readonly isVersion2: boolean,
    private readonly onMessage: (message: Message) => void,
  ) {
    socket.on("data", (chunk: Buffer) => this.read(chunk));
  }

  send({ joinRef, ref, topic, event, payload }: Message): void {
    const text = Buffer.from(
      JSON.stringify(
        this.isVersion2
          ? [joinRef, ref, topic, event, payload]
          : { join_ref: joinRef, ref, topic, event, payload },
      ),
    );
    const header =
      text.length < 126
        ? Buffer.from([0x80 | TEXT_FRAME, text.length])
        : Buffer.from([
            0x80 | TEXT_FRAME,
            126,
            text.length >> 8,
            text.length & 0xff,
          ]);
    if (!this.socket.destroyed) this.socket.write(Buffer.concat([header, text]));
  }

  destroy(): void {
    this.socket.destroy();
  }

  private read(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    for (;;) {
      const frame = this.takeFrame();
      if (frame === null) return;
      if (frame.opcode === CLOSE_FRAME) {
        this.socket.end();
        return;
      }
      if (frame.opcode === TEXT_FRAME) this.onMessage(toMessage(frame.text));
    }
  }

  private takeFrame(): { opcode: number; text: string } | null {
    const { buffer } = this;
    if (buffer.length < 2) return null;
    const opcode = (buffer[0] ?? 0) & 0x0f;
    let length = (buffer[1] ?? 0) & 0x7f;
    let offset = 2;
    if (length === 126) {
      if (buffer.length < 4) return null;
      length = buffer.readUInt16BE(2);
      offset = 4;
    }
    const end = offset + 4 + length;
    if (buffer.length < end) return null;
    const mask = buffer.subarray(offset, offset + 4);
    const body = Buffer.from(buffer.subarray(offset + 4, end));
    body.forEach((byte, index) => {
      body[index] = byte ^ (mask[index % 4] ?? 0);
    });
    this.buffer = buffer.subarray(end);
    return { opcode, text: body.toString() };
  }
}

function toMessage(text: string): Message {
  const value = parseJson(text);
  if (Array.isArray(value)) {
    const [joinRef, ref, topic, event, payload]: unknown[] = value;
    return {
      joinRef,
      ref,
      topic: toText(topic),
      event: toText(event),
      payload,
    };
  }
  const fields = toRecord(value);
  return {
    joinRef: fields.join_ref,
    ref: fields.ref,
    topic: toText(fields.topic),
    event: toText(fields.event),
    payload: fields.payload,
  };
}
