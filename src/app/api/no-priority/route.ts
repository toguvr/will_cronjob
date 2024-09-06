import { ExpoPushNotificationProvider } from '@/app/services/push-notification';
import { supabase } from '@/app/services/supabase';
import { localToUtc } from '@/app/utils/date';

export async function GET() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayStartUTC = localToUtc(todayStart);
  const todayEndUTC = localToUtc(todayEnd);

  const { data: tasks } = await supabase
    .from('tasks')
    .select('user_id, is_concluded, is_days_most_important')
    .eq('is_days_most_important', true)
    .gte('due_date', todayStartUTC)
    .lte('due_date', todayEndUTC);

  const { data: users } = await supabase
    .from('users')
    .select('id, expo_token')
    .not('expo_token', 'is', null);

  const usersWithoutTasks = users.filter((user) => {
    return !tasks.some((task) => task.user_id === user.id);
  });

  if (usersWithoutTasks?.length > 0) {
    const msgs = usersWithoutTasks?.map((user) => {
      return {
        body: 'Selecione uma prioridade!',
        data: { teste: true },
        title: 'Nenhuma tarefa selecionada como prioridade hoje.',
        to: user.expo_token,
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
