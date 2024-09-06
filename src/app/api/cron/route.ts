/* eslint-disable no-continue */
/* eslint-disable guard-for-in */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { createClient } from '@supabase/supabase-js';
import { Expo, ExpoPushTicket } from 'expo-server-sdk';

export type IPushMessage = {
  to: string;
  title: string;
  body: string;
  sound?: 'default';
  data: any;
};

export async function GET() {
  class ExpoPushNotificationProvider {
    private expo: Expo;

    constructor() {
      this.expo = new Expo({ accessToken: process.env.API_ACCESS_TOKEN });
    }

    async sendNotification(allMessages: IPushMessage[]): Promise<void> {
      const messages = [] as IPushMessage[];
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

      const tickets: ExpoPushTicket[] = [];
      (async () => {
        // Send the chunks to the Expo push notification service. There are
        // different strategies you could use. A simple one is to send one chunk at a
        // time, which nicely spreads the load out over time:
        for (const chunk of chunks) {
          try {
            const ticketChunk = await this.expo.sendPushNotificationsAsync(
              chunk
            );
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
        // NOTE: Not all tickets have IDs; for example, tickets for notifications
        // that could not be enqueued will have error information and no receipt ID.
        if (ticket?.id) {
          receiptIds.push(ticket?.id);
        }
      }

      const receiptIdChunks =
        this.expo.chunkPushNotificationReceiptIds(receiptIds);
      (async () => {
        // Like sending notifications, there are different strategies you could use
        // to retrieve batches of receipts from the Expo service.
        for (const chunk of receiptIdChunks) {
          try {
            const receipts = await this.expo.getPushNotificationReceiptsAsync(
              chunk
            );
            console.log(receipts);

            // The receipts specify whether Apple or Google successfully received the
            // notification and information about an error, if one occurred.
            for (const receiptId in receipts) {
              const { status, message, details } = receipts[receiptId];
              if (status === 'ok') {
                continue;
              } else if (status === 'error') {
                console.error(
                  `There was an error sending a notification: ${message}`
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
  const supabaseUrl = process.env.API_SUPABASE_URL;
  const supabaseAnonKey = process.env.API_SUPABASE_ANON_KEY;
  console.log(supabaseUrl);
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
  const formatDateUtz = (date: Date) => {
    const offsetDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    );

    const formattedDate = offsetDate.toISOString().split('T')[0];
    return formattedDate;
  };
  // const today = formatDateUtz(new Date());
  const { data } = await supabase
    .from('users')
    .select('id, expo_token')
    .not('expo_token', 'is', null); // Apenas usuários com expo_token preenchido
  // .not('id', 'in', supabase.from('tasks').select('user_id'));
  console.log(data);
  if (data?.length > 0) {
    const msgs = data?.map((res) => {
      return {
        body: 'Crie suas tarefas!',
        data: { teste: true },
        title: 'Nenhuma tarefa criada hoje.',
        to: res.expo_token,
        sound: 'default',
      };
    });
    new ExpoPushNotificationProvider().sendNotification(msgs);
  }
  // Resposta JSON
  return new Response(
    JSON.stringify({ message: 'Tarefa executada com sucesso!' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
