import { BaseMusicAdapter } from "~/isolated/adapters/base";
import { sendBridgeCommand } from "~/shared/bridge";
import type { MainWorldCommand } from "~/shared/protocol";

export abstract class BridgeBackedAdapter extends BaseMusicAdapter {
  protected bridge(command: MainWorldCommand): Promise<unknown> {
    return sendBridgeCommand(this.platform, command);
  }

  override play(): Promise<void> {
    return this.bridge({ type: "PLAY" }).then(() => undefined);
  }

  override pause(): Promise<void> {
    return this.bridge({ type: "PAUSE" }).then(() => undefined);
  }

  override togglePlay(): Promise<void> {
    return this.bridge({ type: "PLAY_PAUSE" }).then(() => undefined);
  }

  override next(): Promise<void> {
    return this.bridge({ type: "NEXT" }).then(() => undefined);
  }

  override previous(): Promise<void> {
    return this.bridge({ type: "PREVIOUS" }).then(() => undefined);
  }

  override setVolume(volume: number): Promise<void> {
    return this.bridge({ type: "SET_VOLUME", volume }).then(() => undefined);
  }

  override seek(position: number): Promise<void> {
    return this.bridge({ type: "SEEK", position }).then(() => undefined);
  }

  override toggleLike(): Promise<void> {
    return this.bridge({ type: "LIKE" }).then(() => undefined);
  }
}
