import * as line from '@line/bot-sdk'

export function createLineClient(channelAccessToken: string) {
  return new line.messagingApi.MessagingApiClient({ channelAccessToken })
}

export function verifyLineSignature(
  channelSecret: string,
  body: string,
  signature: string
): boolean {
  return line.validateSignature(body, channelSecret, signature)
}

export async function replyText(
  client: line.messagingApi.MessagingApiClient,
  replyToken: string,
  text: string
): Promise<void> {
  await client.replyMessage({
    replyToken,
    messages: [{ type: 'text', text }],
  })
}
