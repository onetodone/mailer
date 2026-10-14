import type { DynamicModule, FactoryProvider, ModuleMetadata, OnApplicationShutdown } from '@nestjs/common'

import type { CustomTemplates, MailerConfig } from '../config'
import type { Locale, LocaleMessages, MessagesOverrides } from '../i18n'
import { createMailer, type Mailer, type WithBuiltIns } from '../mailer'
import type { BuiltInTemplates } from '../templates/built-in'

type ModuleMailer<Templates, ExtraLocales extends string> = Mailer<WithBuiltIns<Templates>, Locale | ExtraLocales>

/**
 * The mailer as a NestJS provider. {@link MailerModule} provides it, so
 * inject it by class, and it closes the transport when the application
 * shuts down.
 *
 * Without type arguments it knows the built-in templates and locales. Pass
 * your custom templates and the locales you add through `messages`, so
 * `send` and `render` check their names and props.
 *
 * @example
 * constructor(private readonly mailer: MailerService) {}
 *
 * await this.mailer.send('resetPassword', { to: email, props: { resetUrl } })
 *
 * @example
 * const templates = { orderShipped }
 *
 * constructor(private readonly mailer: MailerService<typeof templates, 'sk'>) {}
 */
export class MailerService<
  Templates extends CustomTemplates<Templates> = BuiltInTemplates,
  ExtraLocales extends string = never,
>
  implements ModuleMailer<Templates, ExtraLocales>, OnApplicationShutdown
{
  /** Renders a template and hands the email to the transport. See {@link Mailer.send}. */
  readonly send: ModuleMailer<Templates, ExtraLocales>['send']
  /** Renders a template without sending it. See {@link Mailer.render}. */
  readonly render: ModuleMailer<Templates, ExtraLocales>['render']
  /** Closes the transport. {@link MailerService} calls it on shutdown, so you rarely need to. */
  readonly close: ModuleMailer<Templates, ExtraLocales>['close']

  /** Wraps a mailer from `createMailer`, for example in unit tests without {@link MailerModule}. */
  constructor(mailer: ModuleMailer<Templates, ExtraLocales>) {
    this.send = mailer.send.bind(mailer)
    this.render = mailer.render.bind(mailer)
    this.close = mailer.close.bind(mailer)
  }

  /** Closes the transport. NestJS calls it on `app.close()` and, with `enableShutdownHooks()`, on a shutdown signal. */
  async onApplicationShutdown(): Promise<void> {
    await this.close()
  }
}

/** Settings for {@link MailerModule.forRoot}: the {@link MailerConfig} of `createMailer` plus `isGlobal`. */
export interface MailerModuleOptions<
  Templates extends CustomTemplates<Templates> = BuiltInTemplates,
  Overrides extends MessagesOverrides<Templates> = Partial<Record<Locale, LocaleMessages<Templates>>>,
> extends MailerConfig<Templates, Overrides> {
  /** Register the module globally, so every module can inject {@link MailerService}. Default `true`. */
  readonly isGlobal?: boolean | undefined
}

/** Settings for {@link MailerModule.forRootAsync}. */
export interface MailerModuleAsyncOptions<
  Templates extends CustomTemplates<Templates> = BuiltInTemplates,
  Overrides extends MessagesOverrides<Templates> = Partial<Record<Locale, LocaleMessages<Templates>>>,
> {
  /** Modules that export the providers listed in `inject`, such as `ConfigModule`. */
  readonly imports?: ModuleMetadata['imports']
  /** Providers passed to `useFactory` as arguments, in order. */
  readonly inject?: FactoryProvider['inject']
  /** Returns the {@link MailerConfig} of `createMailer`, or a promise of it. */
  readonly useFactory: (
    ...args: never[]
  ) => MailerConfig<Templates, Overrides> | Promise<MailerConfig<Templates, Overrides>>
  /** Register the module globally, so every module can inject {@link MailerService}. Default `true`. */
  readonly isGlobal?: boolean | undefined
}

/**
 * NestJS module that provides {@link MailerService}. Import it once in the
 * root module. Invalid settings throw a `MailerError` with code
 * `INVALID_CONFIG` while the application starts.
 *
 * @example
 * import { Module } from '@nestjs/common'
 * import { MailerModule } from '@onetodone/mailer/nestjs'
 * import { smtpTransport } from '@onetodone/mailer/smtp'
 *
 * @Module({
 *   imports: [
 *     MailerModule.forRoot({
 *       transport: smtpTransport({ host: 'smtp.example.com', port: 465, secure: true, auth }),
 *       from: { name: 'My App', address: 'no-reply@myapp.com' },
 *       branding: { companyName: 'My App', appUrl: 'https://myapp.com', supportEmail: 'support@myapp.com' },
 *     }),
 *   ],
 * })
 * export class AppModule {}
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- NestJS identifies a module by its class
export class MailerModule {
  /** Provides {@link MailerService} from settings known when the module is imported. */
  static forRoot<
    Templates extends CustomTemplates<Templates> = BuiltInTemplates,
    Overrides extends MessagesOverrides<Templates> = Partial<Record<Locale, LocaleMessages<Templates>>>,
  >(options: MailerModuleOptions<Templates, Overrides>): DynamicModule {
    const { isGlobal, ...config } = options
    return mailerModule(isGlobal, [], { provide: MailerService, useFactory: () => serviceFor(config) })
  }

  /**
   * Provides {@link MailerService} from settings built by a factory, such as
   * one that reads `ConfigService`.
   *
   * @example
   * MailerModule.forRootAsync({
   *   imports: [ConfigModule],
   *   inject: [ConfigService],
   *   useFactory: (config: ConfigService) => ({
   *     transport: smtpTransport({ url: config.getOrThrow('SMTP_URL') }),
   *     from: config.getOrThrow('MAIL_FROM'),
   *     branding,
   *   }),
   * })
   */
  static forRootAsync<
    Templates extends CustomTemplates<Templates> = BuiltInTemplates,
    Overrides extends MessagesOverrides<Templates> = Partial<Record<Locale, LocaleMessages<Templates>>>,
  >(options: MailerModuleAsyncOptions<Templates, Overrides>): DynamicModule {
    const { isGlobal, imports = [], inject = [], useFactory } = options
    return mailerModule(isGlobal, imports, {
      provide: MailerService,
      inject,
      useFactory: async (...args: unknown[]) => serviceFor(await useFactory(...(args as never[]))),
    })
  }
}

function serviceFor<Templates extends CustomTemplates<Templates>, Overrides extends MessagesOverrides<Templates>>(
  config: MailerConfig<Templates, Overrides>,
): MailerService {
  return new MailerService(createMailer(config) as Mailer)
}

function mailerModule(
  isGlobal: boolean | undefined,
  imports: NonNullable<ModuleMetadata['imports']>,
  provider: FactoryProvider<MailerService>,
): DynamicModule {
  return { module: MailerModule, global: isGlobal ?? true, imports, providers: [provider], exports: [MailerService] }
}
