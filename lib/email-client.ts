import nodemailer from 'nodemailer'

export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
}

export function createTransporter(config: EmailConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  })
}

export async function sendEmail(
  config: EmailConfig,
  options: {
    from: string
    to: string
    subject: string
    text: string
    inReplyTo?: string
    references?: string
  }
): Promise<void> {
  const transporter = createTransporter(config)
  await transporter.sendMail({
    from: options.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    inReplyTo: options.inReplyTo,
    references: options.references,
  })
}

export function extractEmailAddress(from: string): string {
  const match = from.match(/<(.+?)>/)
  return match ? match[1] : from.trim()
}

export function buildReplySubject(subject: string): string {
  if (subject.toLowerCase().startsWith('re:')) return subject
  return `Re: ${subject}`
}
