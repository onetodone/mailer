import { createServer, type AddressInfo, type Socket } from 'node:net'

export interface ReceivedMail {
  readonly from: string
  readonly to: readonly string[]
  /** Raw message as sent after DATA, with dot-stuffing removed. */
  readonly data: string
}

export interface SmtpServerOptions {
  /** Recipients refused with a 550 reply. */
  readonly reject?: readonly string[]
}

export interface TestSmtpServer {
  readonly port: number
  readonly mails: readonly ReceivedMail[]
  readonly logins: readonly { user: string; pass: string }[]
  close(): Promise<void>
}

function envelopeAddress(argument: string): string {
  return /<([^>]*)>/.exec(argument)?.[1] ?? ''
}

// Just enough SMTP for nodemailer: no STARTTLS, no pipelining, AUTH PLAIN only.
export async function startSmtpServer(options: SmtpServerOptions = {}): Promise<TestSmtpServer> {
  const mails: ReceivedMail[] = []
  const logins: { user: string; pass: string }[] = []
  const sockets = new Set<Socket>()

  const server = createServer((socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
    socket.setEncoding('utf8')

    let buffer = ''
    let from = ''
    let to: string[] = []
    let data: string[] | undefined

    const reply = (line: string) => {
      socket.write(`${line}\r\n`)
    }

    const handle = (line: string) => {
      if (data !== undefined) {
        if (line === '.') {
          mails.push({ from, to, data: data.join('\r\n') })
          data = undefined
          from = ''
          to = []
          reply('250 OK')
        } else {
          data.push(line.startsWith('..') ? line.slice(1) : line)
        }
        return
      }

      const [command = '', ...args] = line.split(' ')
      switch (command.toUpperCase()) {
        case 'EHLO':
          reply('250-localhost')
          reply('250 AUTH PLAIN')
          break
        case 'HELO':
          reply('250 localhost')
          break
        case 'AUTH': {
          const [, user = '', pass = ''] = Buffer.from(args[1] ?? '', 'base64')
            .toString()
            .split('\0')
          logins.push({ user, pass })
          reply('235 Authentication successful')
          break
        }
        case 'MAIL':
          from = envelopeAddress(args.join(' '))
          reply('250 OK')
          break
        case 'RCPT': {
          const address = envelopeAddress(args.join(' '))
          if (options.reject?.includes(address) === true) {
            reply('550 5.1.1 Mailbox unavailable')
          } else {
            to.push(address)
            reply('250 OK')
          }
          break
        }
        case 'DATA':
          data = []
          reply('354 End data with <CR><LF>.<CR><LF>')
          break
        case 'RSET':
          from = ''
          to = []
          reply('250 OK')
          break
        case 'QUIT':
          reply('221 Bye')
          socket.end()
          break
        default:
          reply('502 Command not implemented')
      }
    }

    socket.on('data', (chunk: string) => {
      buffer += chunk
      let end = buffer.indexOf('\r\n')
      while (end !== -1) {
        const line = buffer.slice(0, end)
        buffer = buffer.slice(end + 2)
        handle(line)
        end = buffer.indexOf('\r\n')
      }
    })

    reply('220 localhost ESMTP')
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    port,
    mails,
    logins,
    close: () =>
      new Promise<void>((resolve, reject) => {
        for (const socket of sockets) socket.destroy()
        server.close((error) => {
          if (error === undefined) resolve()
          else reject(error)
        })
      }),
  }
}
