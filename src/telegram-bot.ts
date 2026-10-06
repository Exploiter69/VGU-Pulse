export async function telegramApi(
  token: string,
  method: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  webAppUrl?: string,
): Promise<void> {
  const reply_markup = webAppUrl
    ? { inline_keyboard: [[{ text: "Open VGU Pulse", web_app: { url: webAppUrl } }]] }
    : undefined;

  await telegramApi(token, "sendMessage", {
    chat_id: chatId,
    text,
    reply_markup,
  });
}
