import Expo, { ExpoPushMessage } from 'expo-server-sdk';

export class ExpoPushNotificationProvider {
  private expo: Expo;

  constructor() {
    this.expo = new Expo({
      accessToken: process.env.API_ACCESS_TOKEN,
      useFcmV1: true,
    });
  }

  async sendNotification(allMessages: ExpoPushMessage[]): Promise<void> {
    const messages = [] as ExpoPushMessage[];
    for (const message of allMessages) {
      // Each push token looks like ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]

      // Check that all your push tokens appear to be valid Expo push tokens
      if (!Expo.isExpoPushToken(message.to)) {
        console.error(
          `Push token ${message.to} is not a valid Expo push token`
        );
        continue;
      }

      // Construct a message (see https://docs.expo.io/push-notifications/sending-notifications/)
      messages.push({
        to: message.to,
        sound: 'default',
        body: message.body,
        title: message.title,
        data: message.data,
      });
    }

    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets = [];
    (async () => {
      // Send the chunks to the Expo push notification service. There are
      // different strategies you could use. A simple one is to send one chunk at a
      // time, which nicely spreads the load out over time:
      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          console.log(ticketChunk);
          tickets.push(...ticketChunk);
          // NOTE: If a ticket contains an error code in ticket.details.error, you
          // must handle it appropriately. The error codes are listed in the Expo
          // documentation:
          // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
        } catch (error) {
          console.error(error);
        }
      }
    })();

    const receiptIds = [];
    for (const ticket of tickets) {
      if (ticket.status === 'ok') {
        receiptIds.push(ticket.id);
      }
    }

    const receiptIdChunks =
      this.expo.chunkPushNotificationReceiptIds(receiptIds);
    (async () => {
      for (const chunk of receiptIdChunks) {
        try {
          const receipts = await this.expo.getPushNotificationReceiptsAsync(
            chunk
          );
          console.log(receipts);

          for (const receiptId in receipts) {
            const { status, details } = receipts[receiptId];
            if (status === 'ok') {
              continue;
            } else if (status === 'error') {
              console.error(
                `There was an error sending a notification: ${details.toString()}`
              );
              if (details && details.error) {
                // The error codes are listed in the Expo documentation:
                // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
                // You must handle the errors appropriately.
                console.error(`The error code is ${details.error}`);
              }
            }
          }
        } catch (error) {
          console.error(error);
        }
      }
    })();
  }
}
