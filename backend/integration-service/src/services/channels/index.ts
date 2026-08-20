import { emailChannel } from "./email.channel";
import { Channel } from "./types";
import { webhookChannel } from "./webhook.channel";

/**
 * The channel registry.
 *
 * This list is the whole of §44's "do not hard-code notification providers":
 * everything above the registry looks a channel up by its type string, so
 * adding PagerDuty's native API or an SMS gateway is a file and a line here.
 * No model, controller, dispatcher or console change.
 */
const channels: Channel[] = [webhookChannel, emailChannel];

export const channelFor = (type: string): Channel | undefined =>
  channels.find((c) => c.type === type);

/** What the console renders its "add a target" form from. */
export const availableChannels = () =>
  channels.map((c) => ({
    type: c.type,
    label: c.label,
    description: c.description,
    fields: c.fields,
  }));

export * from "./types";
