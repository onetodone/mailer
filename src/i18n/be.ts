import type { Messages } from './index'

// Durations are in the accusative case: «Спасылка дзейнічае 1 хвіліну».
export const be: Messages = {
  common: {
    greeting: 'Вітаем, {name}!',
    greetingAnonymous: 'Вітаем!',
    linkFallback: 'Калі кнопка не працуе, скапіюйце гэту спасылку ў браўзер:',
    footerSupport: 'Ёсць пытанні? Пішыце нам:',
    footerRights: 'Усе правы абаронены.',
    minutes: { one: '{count} хвіліну', few: '{count} хвіліны', many: '{count} хвілін', other: '{count} хвіліны' },
    hours: { one: '{count} гадзіну', few: '{count} гадзіны', many: '{count} гадзін', other: '{count} гадзіны' },
    days: { one: '{count} дзень', few: '{count} дні', many: '{count} дзён', other: '{count} дня' },
  },
  verifyEmail: {
    subject: 'Пацвердзіце email',
    preheader: 'Застаўся адзін крок, каб завяршыць рэгістрацыю ў {companyName}.',
    heading: 'Пацвердзіце email',
    intro: 'Дзякуй за рэгістрацыю ў {companyName}! Пацвердзіце адрас пошты, каб актываваць акаўнт.',
    button: 'Пацвердзіць email',
    expires: 'Спасылка дзейнічае {duration}.',
    ignore: 'Калі вы не рэгістраваліся ў {companyName}, проста праігнаруйце гэты ліст.',
  },
  resetPassword: {
    subject: 'Скід пароля',
    preheader: 'Задайце новы пароль для акаўнта ў {companyName}.',
    heading: 'Скід пароля',
    intro:
      'Мы атрымалі запыт на скід пароля для вашага акаўнта ў {companyName}. Націсніце на кнопку, каб задаць новы пароль.',
    button: 'Задаць новы пароль',
    expires: 'Спасылка дзейнічае {duration}.',
    ignore: 'Калі вы не запытвалі скід пароля, проста праігнаруйце гэты ліст — пароль застанецца ранейшым.',
  },
  passwordChanged: {
    subject: 'Пароль зменены',
    preheader: 'Пароль ад вашага акаўнта ў {companyName} быў зменены.',
    heading: 'Пароль зменены',
    intro: 'Пароль ад вашага акаўнта ў {companyName} быў зменены.',
    changedAt: 'Калі: {date}',
    ip: 'IP-адрас: {ip}',
    ifYou: 'Калі гэта былі вы, нічога рабіць не трэба.',
    notYou: 'Калі гэта былі не вы, адразу звярніцеся ў падтрымку.',
    button: 'Звярнуцца ў падтрымку',
    notYouEmail: 'Калі гэта былі не вы, адразу напішыце нам на {email}.',
  },
}
