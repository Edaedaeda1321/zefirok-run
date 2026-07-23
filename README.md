# Зефирок: проверяемые подарочные коды через @zefirok_obn_bot

В архиве находятся только новые и изменённые файлы. Папку `assets` из действующего проекта удалять не нужно.

## Что изменено

- Код награды больше не создаётся внутри браузера.
- Игра запрашивает настоящий код у Cloudflare Worker.
- Worker проверяет подпись `Telegram.WebApp.initData`.
- Коды хранятся в бесплатной базе Cloudflare D1.
- Один запрос покупки нельзя повторно использовать: используется `requestId`.
- Серверный лимит — не больше 2 настоящих кодов за 24 часа.
- Сотрудник отправляет код боту и нажимает «Выдать подарок и списать».
- Списание выполняется одной условной операцией в базе, поэтому один код нельзя списать дважды.
- Игра обновляет раздел «Мои покупки»: использованный код получает статус «Списан».
- В обычном браузере можно играть, но получить настоящий подарок можно только при запуске Mini App через Telegram.

## Новая структура проекта

```text
zefirok-run/
├── assets/                  # оставить существующую папку
├── migrations/
│   └── 0001_rewards.sql
├── src/
│   └── worker.js
├── .assetsignore
├── index.html
└── wrangler.jsonc
```

## 1. Обновление локальной Git-папки

Не удаляйте существующую папку репозитория и `.git`.

Скопируйте из этого архива в действующую папку `zefirok-run`:

- `index.html` — заменить старый;
- `wrangler.jsonc` — заменить старый;
- `.assetsignore` — добавить;
- папку `src` — добавить;
- папку `migrations` — добавить.

Папку `assets` и её содержимое не заменяйте целиком.

## 2. Создание бесплатной базы D1

В Терминале откройте папку проекта:

```bash
cd /путь/до/zefirok-run
npx wrangler login
npx wrangler d1 create zefirok-rewards
```

Команда покажет `database_id`. Вставьте его в `wrangler.jsonc` вместо:

```text
REPLACE_WITH_D1_DATABASE_ID
```

Если Wrangler предложит автоматически добавить ещё один блок D1 в конфигурацию, откажитесь: готовый блок уже находится в файле.

Примените таблицы:

```bash
npx wrangler d1 migrations apply zefirok-rewards --remote
```

## 3. Секреты

Токен из BotFather нельзя добавлять в `index.html`, `wrangler.jsonc` или GitHub.

Выполните команды по очереди. После каждой команды Терминал попросит ввести значение:

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put BOT_SETUP_KEY
npx wrangler secret put STAFF_SETUP_CODE
```

Значения:

- `TELEGRAM_BOT_TOKEN` — токен бота `@zefirok_obn_bot`, полученный в BotFather.
- `TELEGRAM_WEBHOOK_SECRET` — случайная строка длиной 16–64 символа. Разрешены латинские буквы, цифры, `_` и `-`.
- `BOT_SETUP_KEY` — длинный секрет для подключения webhook.
- `STAFF_SETUP_CODE` — код, который сотрудник один раз отправит боту командой `/staff КОД`.

Пример формата, но не используйте именно эти значения:

```text
TELEGRAM_WEBHOOK_SECRET = zefirok_webhook_X7f92kLm4Qp8
BOT_SETUP_KEY = setup_9Rk2mP7sQ4vN8xL6
STAFF_SETUP_CODE = CAFE-4827
```

## 4. Развёртывание

```bash
npx wrangler deploy
```

После команды скопируйте адрес Worker, например:

```text
https://zefirok-run.ВАШ-ПОДДОМЕН.workers.dev
```

## 5. Подключение бота к Worker

Замените адрес и ключ в команде:

```bash
curl -X POST "https://zefirok-run.ВАШ-ПОДДОМЕН.workers.dev/api/bot/setup-webhook" \
  -H "Authorization: Bearer ВАШ_BOT_SETUP_KEY"
```

В успешном ответе будет:

```json
{"ok":true}
```

Эта команда также добавляет команды `/start`, `/help`, `/whoami` и `/staff` в меню бота.

## 6. Подключение сотрудника

Сотрудник открывает `@zefirok_obn_bot` и отправляет:

```text
/staff CAFE-4827
```

Вместо примера используется ваш `STAFF_SETUP_CODE`.

После подтверждения сотрудник может отправлять боту коды гостей обычным сообщением:

```text
CP-ABCD-EFGH
```

Бот покажет награду, срок действия и кнопку:

```text
Выдать подарок и списать
```

После передачи подарка сотрудник подтверждает списание. Повторно использовать код нельзя.

## 7. Проверка

1. Откройте игру именно через кнопку Mini App в `@zefirok_obn_bot`.
2. Выдайте себе валюту штатным способом для теста.
3. Купите товар.
4. Убедитесь, что появился код формата `CP-XXXX-XXXX`.
5. Отправьте код боту с аккаунта зарегистрированного сотрудника.
6. Нажмите «Выдать подарок и списать» и подтвердите.
7. Вернитесь в игре в «Мои покупки». В течение нескольких секунд карточка станет «Списан».

## Важные настройки

В `src/worker.js` находятся товары, которые Worker разрешает выдавать:

```js
const PRODUCTS = {
  zefir: ...,
  americano: ...,
  cappuccino: ...
};
```

Лимиты можно задать как обычные переменные Cloudflare:

```text
REWARD_LIMIT_MAX=2
REWARD_LIMIT_WINDOW_SECONDS=86400
REWARD_TTL_SECONDS=86400
INIT_DATA_MAX_AGE_SECONDS=86400
```

Без этих переменных используются указанные значения по умолчанию.

## Git

После локальной настройки:

```bash
git status
git add index.html wrangler.jsonc .assetsignore src migrations
git commit -m "Add Telegram reward code verification"
git push
```

Секреты Wrangler не попадают в Git.
