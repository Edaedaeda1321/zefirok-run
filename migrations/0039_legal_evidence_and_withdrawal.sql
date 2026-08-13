-- Legal evidence v3: immutable document archive, SHA-256 evidence, and consent withdrawal history.
-- Published document rows are append-only by application design; no update/delete API exists for this archive.

CREATE TABLE IF NOT EXISTS legal_document_versions (
  document_key TEXT NOT NULL CHECK(document_key IN ('agreement','privacy','consent')),
  document_version TEXT NOT NULL,
  content_ru TEXT NOT NULL,
  content_en TEXT NOT NULL,
  sha256_ru TEXT NOT NULL,
  sha256_en TEXT NOT NULL,
  sha256_bundle TEXT NOT NULL,
  published_at INTEGER NOT NULL DEFAULT 0,
  published_by TEXT NOT NULL DEFAULT '',
  published_by_name TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'control_center',
  PRIMARY KEY(document_key,document_version)
);

CREATE INDEX IF NOT EXISTS idx_legal_versions_recent
ON legal_document_versions(document_key,published_at DESC);

CREATE TABLE IF NOT EXISTS legal_acceptance_evidence (
  telegram_id TEXT NOT NULL,
  document_key TEXT NOT NULL CHECK(document_key IN ('agreement','privacy','consent')),
  document_version TEXT NOT NULL,
  acceptance_kind TEXT NOT NULL CHECK(acceptance_kind IN ('accepted','acknowledged')),
  sha256_ru TEXT NOT NULL DEFAULT '',
  sha256_en TEXT NOT NULL DEFAULT '',
  sha256_bundle TEXT NOT NULL DEFAULT '',
  recorded_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(telegram_id,document_key,document_version,acceptance_kind)
);

CREATE INDEX IF NOT EXISTS idx_legal_evidence_hash
ON legal_acceptance_evidence(document_key,document_version,sha256_bundle);

CREATE TABLE IF NOT EXISTS legal_consent_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL,
  document_version TEXT NOT NULL DEFAULT '',
  event_kind TEXT NOT NULL CHECK(event_kind IN ('consented','withdrawn')),
  language TEXT NOT NULL DEFAULT 'ru' CHECK(language IN ('ru','en')),
  event_at INTEGER NOT NULL,
  ip_address TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  actor_id TEXT NOT NULL DEFAULT '',
  actor_name TEXT NOT NULL DEFAULT '',
  event_key TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_legal_consent_events_player
ON legal_consent_events(telegram_id,event_at DESC,id DESC);

CREATE TABLE IF NOT EXISTS legal_consent_current (
  telegram_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('active','revoked')),
  document_version TEXT NOT NULL DEFAULT '',
  event_at INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  actor_id TEXT NOT NULL DEFAULT '',
  actor_name TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO legal_document_versions(
  document_key,document_version,content_ru,content_en,sha256_ru,sha256_en,sha256_bundle,published_at,published_by,published_by_name,source
) VALUES(
  'agreement','2026-08-13.1','# ЛИЦЕНЗИОННОЕ СОГЛАШЕНИЕ И УСЛОВИЯ ИСПОЛЬЗОВАНИЯ

## сервиса «Сладкий Забег»

**Редакция от 13 августа 2026 года**

### 1. Общие положения

1.1. Настоящее Лицензионное соглашение и Условия использования (далее — **«Соглашение»**) регулируют использование программного продукта и сервиса **«Сладкий Забег»**, включая игру, Telegram-бот, Telegram Mini App, связанные веб-страницы, игровые системы, Battle Pass, рейтинг, магазин, кейсы, промокоды, систему физических наград и иные связанные функции (далее совместно — **«Сервис»**).

1.2. Правообладателем и оператором Сервиса является:

**Индивидуальный предприниматель Шепелева Ольга Сергеевна**
 ИНН: **402577489644**
 ОГРНИП: **324400000018609**
 E-mail: **patokad6@gmail.com**

далее — **«Правообладатель»**.

1.3. Соглашение предназначено для физических лиц, а также организаций, индивидуальных предпринимателей и иных лиц, использующих Сервис через своих надлежащим образом уполномоченных представителей.

1.4. Коммерческие, рекламные, интеграционные, спонсорские, партнёрские и иные отношения между Правообладателем и организациями или партнёрами регулируются отдельными договорами. Настоящее Соглашение само по себе не предоставляет права коммерческого использования Сервиса.

1.5. Территорией предоставления лицензии является Российская Федерация и государства — участники СНГ, в которых использование Сервиса допускается применимым законодательством.

1.6. К настоящему Соглашению применяется законодательство Российской Федерации.

### 2. Принятие Соглашения

2.1. Перед первым полноценным использованием Сервиса Пользователю предоставляется возможность ознакомиться с настоящим Соглашением и Политикой конфиденциальности.

2.2. Нажатие кнопки **«Принимаю»** в отношении настоящего Соглашения означает полное и безоговорочное принятие его условий.

2.3. Согласие на обработку персональных данных, если оно требуется как самостоятельное правовое основание обработки, оформляется отдельно от принятия настоящего Соглашения.

2.4. Если Пользователь не согласен с условиями Соглашения, он не должен продолжать использование Сервиса.

### 3. Возраст пользователей

3.1. Сервис рассчитан на аудиторию **6+**.

3.2. Несовершеннолетние используют Сервис с соблюдением ограничений дееспособности и иных требований законодательства, применимых к их возрасту.

3.3. В случаях, когда для совершения сделки, предоставления согласия или иного юридически значимого действия законодательство требует участия или согласия родителя, усыновителя, опекуна либо иного законного представителя, такое участие или согласие должно быть получено.

### 4. Лицензия

4.1. Правообладатель предоставляет Пользователю простую (неисключительную), ограниченную, непередаваемую и не подлежащую сублицензированию лицензию на использование Сервиса исключительно посредством предусмотренного Правообладателем пользовательского интерфейса.

4.2. Лицензия предоставляется для личного некоммерческого использования, если иное прямо не согласовано с Правообладателем отдельным письменным договором.

4.3. Пользователю запрещается без письменного разрешения Правообладателя:

а) копировать или распространять программный код и иные охраняемые элементы Сервиса за пределами случаев, прямо предусмотренных законом;

б) продавать, передавать, сдавать в аренду или иным способом предоставлять права на Сервис третьим лицам;

в) модифицировать программный код или создавать производные продукты;

г) декомпилировать, осуществлять обратную разработку, исследовать внутреннюю реализацию или обходить технические средства защиты, кроме случаев, прямо допускаемых императивными нормами законодательства;

д) использовать Сервис, графику, музыку, игровые объекты, персонажей, названия или иные материалы в коммерческих целях;

е) использовать программные интерфейсы или внутренние запросы Сервиса способом, не предусмотренным обычным пользовательским интерфейсом.

4.4. Все права, прямо не предоставленные настоящим Соглашением, сохраняются за Правообладателем.

### 5. Учётная запись

5.1. Игровая учётная запись может быть технически связана с Telegram ID Пользователя.

5.2. Учётная запись предназначена только для её владельца.

5.3. Продажа, покупка, передача, аренда, обмен или иное предоставление учётной записи третьему лицу запрещены.

5.4. Создание или использование нескольких учётных записей одним лицом запрещается, в том числе для обхода игровых ограничений, лимитов, санкций, получения повторных наград или иных преимуществ.

5.5. Пользователь несёт ответственность за действия, совершаемые через его учётную запись, в пределах, установленных законодательством.

### 6. Правила честной игры

6.1. Запрещаются:

— читы, боты, автоматизация и стороннее программное обеспечение, дающее игровое преимущество;

— намеренная эксплуатация ошибок, уязвимостей и багов;

— мошенничество и попытки получения наград, товаров или ресурсов обманным способом;

— вмешательство в API, сетевые запросы, backend, базы данных или механизм авторизации;

— подделка Telegram-данных, запросов или идентификаторов;

— обход лимитов, блокировок или технических ограничений;

— использование нескольких аккаунтов;

— вмешательство в игровой клиент;

— оскорбления, угрозы, травля и иное недопустимое поведение;

— иные действия, нарушающие нормальную работу Сервиса либо создающие несправедливое преимущество.

6.2. Правообладатель вправе применять предупреждение, временное ограничение функций, аннулирование неправомерно полученного результата, временную блокировку либо постоянную блокировку учётной записи в зависимости от характера нарушения.

6.3. Правообладатель вправе временно ограничить доступ на период проверки подозрительной активности.

6.4. Пользователь вправе обратиться для пересмотра блокировки по адресу **patokad6@gmail.com**.

6.5. Правообладатель не обязан раскрывать технические алгоритмы антифрода, античита и обнаружения нарушений, если такое раскрытие может снизить эффективность механизмов защиты.

### 7. Внутриигровые ресурсы и предметы

7.1. Очки, зефир, кофе, опыт, игровые уровни, аватары, рамки, следы, музыка, скины, кейсы, награды и иные виртуальные объекты являются элементами Сервиса.

7.2. Если прямо не указано иное при совершении отдельной платной операции, виртуальные объекты:

— не являются денежными средствами;

— не являются электронными деньгами;

— не подлежат обмену на наличные денежные средства;

— не имеют гарантированного денежного эквивалента;

— не могут продаваться или передаваться между Пользователями без разрешения Правообладателя.

7.3. Получение виртуального объекта не означает приобретение исключительного права на его графику, музыку, название, программную реализацию или иной объект интеллектуальной собственности.

### 8. Сезоны и Battle Pass

8.1. Правообладатель определяет структуру игровых сезонов, количество уровней, необходимый опыт, состав заданий, награды, даты начала и окончания, содержимое будущих кейсов и иные параметры.

8.2. Правообладатель вправе изменять баланс, игровые правила, будущие награды, XP, задания, механику догоняющего опыта и структуру будущих сезонов.

8.3. В отношении уже оплаченного Пользователем контента применяются условия, показанные Пользователю перед его приобретением, и обязательные требования законодательства.

8.4. Правообладатель вправе в будущем вводить платные функции, сезонные пропуски, цифровые коды активации, дополнительные наборы или иной платный цифровой контент.

8.5. До совершения соответствующей оплаты Пользователю должны быть доступны применимые к покупке цена и существенные условия.

8.6. Сезонный пропуск в будущем может предоставляться посредством покупки в Сервисе либо путём получения и активации кода, в том числе приобретённого на кассе партнёра.

### 9. Кейсы и промокоды

9.1. Кейсы могут предоставляться за игровую активность, внутриигровые ресурсы, достижения, компенсацию, сезонные награды либо посредством промокода.

9.2. Промокоды могут выдаваться Правообладателем или партнёрами, в том числе непосредственно в кафе.

9.3. Промокод может иметь срок действия, лимит активаций, ограничения по Пользователю и иные явно указанные условия.

9.4. Содержимое кейса может определяться случайным образом в соответствии с действующей игровой механикой.

9.5. Виртуальные результаты открытия кейса не подлежат обмену на денежные средства.

### 10. Физические товары и QR-коды

10.1. Сервис может предоставлять возможность обменять предусмотренные внутриигровые ресурсы на право получения определённого физического товара.

10.2. Если интерфейсом конкретной акции или товара не предусмотрено иное, действует ограничение **не более двух операций получения физических товаров в сутки на одного Пользователя**.

10.3. После подтверждения операции Пользователю может быть сформирован QR-код для получения товара в соответствующей точке выдачи.

10.4. QR-код действует **24 часа с момента его формирования**, если иной срок прямо не указан Пользователю.

10.5. После истечения указанного срока неиспользованный QR-код автоматически аннулируется.

10.6. Внутриигровые ресурсы по истёкшему неиспользованному QR-коду автоматически не восстанавливаются.

10.7. Служба поддержки вправе по своему усмотрению восстановить ресурс, повторно выдать QR-код либо предоставить иную компенсацию с учётом обстоятельств конкретного случая.

10.8. Если Правообладатель признаёт, что получение товара стало невозможным вследствие технической ошибки Сервиса, ошибки со стороны Правообладателя либо другого обстоятельства, за которое Правообладатель принимает ответственность, Пользователю может быть предоставлена компенсация в эквивалентном размере **1:1**. Конкретная форма компенсации определяется Правообладателем.

10.9. Положения настоящего раздела о внутренних правилах компенсации являются дополнительной добровольной мерой и не ограничивают права Пользователя, предоставленные ему императивными нормами законодательства.


### 11. Обновления и изменение Сервиса

11.1. Правообладатель вправе развивать Сервис, выпускать обновления, добавлять и удалять игровые функции, изменять интерфейс, баланс, дизайн, задания, сезоны, рейтинговые правила и игровые системы.

11.2. Некоторые функции могут временно отключаться для технического обслуживания, устранения ошибок, предотвращения злоупотреблений или обновления.

11.3. Изменения бесплатных игровых механик могут применяться ко всем Пользователям с момента их введения.

11.4. Изменения не должны отменять обязательные права Пользователя в отношении уже совершённых возмездных операций.

### 12. Прекращение работы Сервиса

12.1. Правообладатель вправе прекратить поддержку отдельной функции, сезона либо всего Сервиса.

12.2. Если это разумно возможно, Правообладатель вправе предварительно уведомить Пользователей о существенном прекращении работы.

12.3. Вопросы уже оплаченных, но не предоставленных товаров, услуг или цифрового контента при прекращении Сервиса разрешаются в соответствии с условиями соответствующей операции и обязательными требованиями законодательства.

### 13. Интеллектуальная собственность

13.1. Программный код, дизайн, интерфейс, игровые механики в охраняемой законом части, графика, изображения, персонажи, музыка, тексты, названия, базы данных и иные материалы Сервиса принадлежат Правообладателю либо используются им на законных основаниях.

13.2. Настоящее Соглашение не передаёт Пользователю исключительные права.

13.3. Пользователь не вправе регистрировать обозначения, копирующие или имитирующие элементы Сервиса, либо выдавать себя за Правообладателя или официальный проект.

### 14. Пользовательский контент

14.1. На текущем этапе Сервис не предусматривает загрузку Пользователями собственных изображений, текстов, аудио или иных материалов для публичного размещения.

14.2. Технические данные Telegram-профиля, автоматически отображаемые в Сервисе, не считаются предоставлением Пользователю функции публичного пользовательского контента.

### 15. Доступность и ответственность

15.1. Сервис развивается и может содержать программные ошибки.

15.2. Правообладатель не гарантирует абсолютную бесперебойность работы Telegram, интернет-соединения, оборудования Пользователя и внешней инфраструктуры, не находящейся под контролем Правообладателя.

15.3. Правообладатель предпринимает разумные меры для сохранения игрового прогресса и работоспособности Сервиса.

15.4. В максимально допустимых законом пределах Правообладатель не несёт ответственности за косвенный ущерб, упущенную выгоду или последствия использования Сервиса не по назначению.

15.5. Ничто в настоящем разделе не исключает ответственность Правообладателя в случаях, когда её исключение или ограничение запрещено законодательством Российской Федерации.

### 16. Сторонние сервисы

16.1. Работа Сервиса может зависеть от Telegram, интернет-провайдеров, хостинговой и иной технологической инфраструктуры.

16.2. Отдельные сторонние платформы могут иметь собственные условия использования и политики обработки данных.

### 17. Персональные данные

17.1. Обработка персональных данных осуществляется в соответствии с отдельной **Политикой конфиденциальности и обработки персональных данных**.

17.2. Для данных, необходимых непосредственно для заключения и исполнения настоящего Соглашения, обработка может основываться на исполнении договора в предусмотренных законом случаях; в иных случаях используется соответствующее законное основание, включая отдельное согласие Пользователя, если оно необходимо. Российское законодательство прямо допускает обработку данных, необходимую для исполнения договора с субъектом, и одновременно запрещает собирать избыточные данные. 

### 18. Изменение Соглашения

18.1. Правообладатель вправе принимать новую редакцию настоящего Соглашения в связи с развитием Сервиса или изменением законодательства.

18.2. Существенные изменения доводятся до Пользователя способом, доступным через Сервис.

18.3. Изменения условий уже совершённой платной операции не применяются ретроспективно в той мере, в которой это нарушало бы обязательные права Пользователя.

### 19. Прекращение Соглашения

19.1. Пользователь вправе прекратить использование Сервиса в любое время.

19.2. Правообладатель вправе прекратить предоставление лицензии конкретному Пользователю при существенном или повторном нарушении настоящего Соглашения.

19.3. При прекращении доступа Пользователь обязан прекратить использование Сервиса.

### 20. Разрешение споров

20.1. Стороны могут попытаться урегулировать спор путём обращения в службу поддержки по адресу **patokad6@gmail.com**.

20.2. Если урегулирование не достигнуто, спор рассматривается компетентным государственным судом Российской Федерации.

20.3. Для Пользователей, являющихся потребителями, сохраняется право выбора территориальной подсудности в случаях, предусмотренных законодательством Российской Федерации. 

### 21. Заключительные положения

21.1. Если отдельное положение настоящего Соглашения признано недействительным, это само по себе не влечёт недействительности остальных положений.

21.2. В случае противоречия между настоящим Соглашением и обязательными требованиями законодательства применяются требования законодательства.

21.3. Для партнёрских и коммерческих отношений могут заключаться отдельные соглашения.

21.4. Официальным языком настоящего Соглашения является русский. Английская версия предоставляется для удобства. При расхождении толкований применяется русская редакция в пределах, допускаемых законодательством.','# LICENSE AGREEMENT AND TERMS OF USE

## “SWEET RUN” Service

**Version dated 13 August 2026**

### 1. General Provisions

1.1. This License Agreement and Terms of Use (the **“Agreement”**) governs the use of the software product and service **“Sweet Run”**, including the game, Telegram bot, Telegram Mini App, related web pages, game systems, Battle Pass, rankings, store, cases, promotional codes, physical reward system and other related functions (collectively, the **“Service”**).

1.2. The right holder and operator of the Service is:

**Individual Entrepreneur Olga Sergeevna Shepeleva**
TIN: **402577489644**
Primary State Registration Number of Individual Entrepreneur: **324400000018609**
E-mail: **patokad6@gmail.com**

hereinafter, the **“Right Holder”**.

1.3. The Agreement is intended for individuals, as well as organizations, individual entrepreneurs and other persons using the Service through their duly authorized representatives.

1.4. Commercial, advertising, integration, sponsorship, partnership and other relationships between the Right Holder and organizations or partners are governed by separate agreements. This Agreement by itself does not grant any right to commercially use the Service.

1.5. The licensed territory is the Russian Federation and the CIS member states in which use of the Service is permitted by applicable law.

1.6. This Agreement is governed by the laws of the Russian Federation.

### 2. Acceptance of the Agreement

2.1. Before the first full use of the Service, the User is given the opportunity to review this Agreement and the Privacy and Personal Data Processing Policy.

2.2. Clicking **“I Accept”** in relation to this Agreement constitutes the User’s full and unconditional acceptance of its terms.

2.3. Consent to personal data processing, where required as a separate legal basis for processing, is obtained separately from acceptance of this Agreement.

2.4. If the User does not agree to the terms of this Agreement, the User must not continue using the Service.

### 3. User Age

3.1. The Service is intended for an audience aged **6+**.

3.2. Minors may use the Service subject to legal-capacity limitations and other requirements of law applicable to their age.

3.3. Where the law requires the participation or consent of a parent, adoptive parent, guardian or other legal representative for a transaction, consent or other legally significant action, such participation or consent must be obtained.

### 4. License

4.1. The Right Holder grants the User a simple (non-exclusive), limited, non-transferable and non-sublicensable license to use the Service solely through the user interfaces made available by the Right Holder.

4.2. The license is granted for personal, non-commercial use unless otherwise expressly agreed with the Right Holder in a separate written agreement.

4.3. Without the Right Holder’s written permission, the User may not:

— copy or distribute software code or other protected elements of the Service except where expressly permitted by law;

— sell, transfer, lease or otherwise provide rights to the Service to third parties;

— modify software code or create derivative products;

— decompile, reverse engineer, investigate internal implementation or bypass technical protection measures, except where mandatory law expressly permits otherwise;

— use the Service, graphics, music, game objects, characters, names or other materials for commercial purposes;

— use program interfaces or internal Service requests in a manner not provided by the ordinary user interface.

4.4. All rights not expressly granted under this Agreement remain with the Right Holder.

### 5. Account

5.1. A game account may be technically linked to the User’s Telegram ID.

5.2. An account is intended solely for its owner.

5.3. Selling, purchasing, transferring, renting, exchanging or otherwise providing an account to a third party is prohibited.

5.4. Creating or using multiple accounts by one person is prohibited, including for evading game restrictions or limits, sanctions, obtaining repeated rewards or other advantages.

5.5. The User is responsible for actions performed through the User’s account to the extent established by law.

### 6. Fair Play Rules

6.1. The following are prohibited:

— cheats, bots, automation and third-party software providing a gameplay advantage;

— intentional exploitation of errors, vulnerabilities or bugs;

— fraud and attempts to obtain rewards, goods or resources by deception;

— interference with APIs, network requests, backend systems, databases or authorization mechanisms;

— falsification of Telegram data, requests or identifiers;

— bypassing limits, blocks or technical restrictions;

— use of multiple accounts;

— interference with the game client;

— insults, threats, harassment or other unacceptable behavior;

— other actions that disrupt normal operation of the Service or create an unfair advantage.

6.2. Depending on the nature of a violation, the Right Holder may issue a warning, temporarily restrict functionality, invalidate an improperly obtained result, temporarily suspend or permanently ban an account.

6.3. The Right Holder may temporarily restrict access while suspicious activity is being reviewed.

6.4. The User may request review of a restriction by contacting **patokad6@gmail.com**.

6.5. The Right Holder is not required to disclose technical anti-fraud, anti-cheat or violation-detection algorithms where disclosure may reduce the effectiveness of protective mechanisms.

### 7. In-Game Resources and Items

7.1. Points, marshmallows, coffee, experience, game levels, avatars, frames, trails, music, skins, cases, rewards and other virtual objects are elements of the Service.

7.2. Unless expressly stated otherwise for a particular paid transaction, virtual objects:

— are not money;

— are not electronic money;

— cannot be exchanged for cash;

— have no guaranteed monetary equivalent;

— cannot be sold or transferred between Users without the Right Holder’s permission.

7.3. Receiving a virtual object does not transfer any exclusive right to its graphics, music, name, software implementation or other intellectual property.

### 8. Seasons and Battle Pass

8.1. The Right Holder determines the structure of game seasons, number of levels, required experience, tasks, rewards, start and end dates, contents of future cases and other parameters.

8.2. The Right Holder may change balance, game rules, future rewards, XP, tasks, catch-up experience mechanics and the structure of future seasons.

8.3. For content already paid for by the User, the terms shown before purchase and mandatory requirements of law apply.

8.4. The Right Holder may introduce paid features, season passes, digital activation codes, additional sets or other paid digital content in the future.

8.5. Before the relevant payment is made, the User must be given access to the applicable price and material purchase terms.

8.6. A season pass may in the future be provided through an in-Service purchase or by receipt and activation of a code, including a code purchased at a partner’s checkout.

### 9. Cases and Promotional Codes

9.1. Cases may be provided for game activity, in-game resources, achievements, compensation, season rewards or through a promotional code.

9.2. Promotional codes may be distributed by the Right Holder or partners, including directly at a café.

9.3. A promotional code may have an expiration date, activation limit, User restrictions or other expressly stated terms.

9.4. Case contents may be determined randomly in accordance with the applicable game mechanics.

9.5. Virtual results of opening a case cannot be exchanged for money.

### 10. Physical Goods and QR Codes

10.1. The Service may allow certain in-game resources to be exchanged for the right to receive a specified physical item.

10.2. Unless the interface of a particular promotion or item provides otherwise, a limit of **no more than two physical-item redemption operations per User per day** applies.

10.3. After the operation is confirmed, a QR code may be generated for the User to receive the item at the relevant pickup point.

10.4. Unless another period is expressly shown to the User, the QR code is valid for **24 hours from the time it is generated**.

10.5. An unused QR code is automatically cancelled after its validity period expires.

10.6. In-game resources spent on an expired unused QR code are not restored automatically.

10.7. Support may, at its discretion, restore a resource, reissue a QR code or provide other compensation depending on the circumstances of the particular case.

10.8. If the Right Holder determines that receiving an item became impossible due to a technical error of the Service, an error attributable to the Right Holder or another circumstance for which the Right Holder accepts responsibility, the User may receive equivalent **1:1** compensation. The specific form of compensation is determined by the Right Holder.

10.9. The internal compensation rules in this section are an additional voluntary measure and do not limit any rights granted to the User by mandatory law.

### 11. Updates and Changes to the Service

11.1. The Right Holder may develop the Service, release updates, add or remove game functions, and change the interface, balance, design, tasks, seasons, ranking rules and game systems.

11.2. Certain functions may be temporarily disabled for maintenance, error correction, abuse prevention or updates.

11.3. Changes to free gameplay mechanics may apply to all Users from the moment they are introduced.

11.4. Changes may not cancel mandatory User rights relating to paid transactions already completed.

### 12. Discontinuation of the Service

12.1. The Right Holder may discontinue support for an individual function, a season or the entire Service.

12.2. Where reasonably possible, the Right Holder may inform Users in advance of a material discontinuation.

12.3. Issues concerning paid but not yet provided goods, services or digital content upon discontinuation are resolved in accordance with the terms of the relevant transaction and mandatory law.

### 13. Intellectual Property

13.1. Software code, design, interface, protectable game mechanics, graphics, images, characters, music, texts, names, databases and other Service materials belong to the Right Holder or are lawfully used by the Right Holder.

13.2. This Agreement does not transfer exclusive rights to the User.

13.3. The User may not register designations that copy or imitate elements of the Service, or impersonate the Right Holder or the official project.

### 14. User Content

14.1. At the current stage, the Service does not provide functionality for Users to upload their own images, texts, audio or other materials for public posting.

14.2. Technical Telegram profile data automatically displayed in the Service is not considered provision of public user-generated content functionality to the User.

### 15. Availability and Liability

15.1. The Service is under development and may contain software errors.

15.2. The Right Holder does not guarantee absolutely uninterrupted operation of Telegram, internet connections, User equipment or external infrastructure outside the Right Holder’s control.

15.3. The Right Holder takes reasonable measures to preserve game progress and maintain the Service’s operability.

15.4. To the maximum extent permitted by law, the Right Holder is not liable for indirect damage, lost profit or consequences of using the Service other than for its intended purpose.

15.5. Nothing in this section excludes the Right Holder’s liability where exclusion or limitation is prohibited by the laws of the Russian Federation.

### 16. Third-Party Services

16.1. Operation of the Service may depend on Telegram, internet providers, hosting services and other technology infrastructure.

16.2. Individual third-party platforms may have their own terms of use and data-processing policies.

### 17. Personal Data

17.1. Personal data is processed in accordance with the separate **Privacy and Personal Data Processing Policy**.

17.2. Where data is necessary directly to enter into or perform this Agreement, processing may rely on contractual necessity in cases provided by law; in other cases, an appropriate lawful basis is used, including separate User consent where required.

### 18. Changes to the Agreement

18.1. The Right Holder may adopt a new version of this Agreement due to development of the Service or changes in law.

18.2. Material changes are communicated to the User by a method available through the Service.

18.3. Changes to terms of a paid transaction already completed do not apply retroactively to the extent that doing so would violate mandatory User rights.

### 19. Termination of the Agreement

19.1. The User may stop using the Service at any time.

19.2. The Right Holder may terminate the license granted to a particular User in the event of a material or repeated breach of this Agreement.

19.3. Upon termination of access, the User must stop using the Service.

### 20. Dispute Resolution

20.1. The parties may attempt to resolve a dispute by contacting support at **patokad6@gmail.com**.

20.2. If the dispute is not resolved, it is considered by a competent state court of the Russian Federation.

20.3. Users who are consumers retain the right to choose territorial jurisdiction where such choice is provided by the laws of the Russian Federation.

### 21. Final Provisions and Language

21.1. If an individual provision of this Agreement is found invalid, this does not by itself invalidate the remaining provisions.

21.2. If this Agreement conflicts with mandatory law, mandatory legal requirements apply.

21.3. Separate agreements may be concluded for partnership and commercial relationships.

21.4. The official language of this Agreement is Russian. The English version is provided for convenience. In the event of differences in interpretation, the Russian version prevails to the extent permitted by law.','7b9dad94ff4319c98b5fd01ade558ed3e409db705a8417551f89eb0dc4792c46','3f93d567fefd8e936a7ac8f63a9a5ceefc6bd6ecfcdfaad2e3733cf6e34d02d0','93f28cca0556b480ee44a73ef775187a397dfc61bd4efda1171526a84fa69e84',CAST(strftime('%s','now') AS INTEGER),'system','Built-in release','builtin_seed'
);

INSERT OR IGNORE INTO legal_document_versions(
  document_key,document_version,content_ru,content_en,sha256_ru,sha256_en,sha256_bundle,published_at,published_by,published_by_name,source
) VALUES(
  'privacy','2026-08-13.2','# ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ

## и обработки персональных данных сервиса «Сладкий Забег»

**Редакция от 13 августа 2026 года**

### 1. Оператор

Оператором персональных данных является:

**ИП Шепелева Ольга Сергеевна**
 ИНН: **402577489644**
 ОГРНИП: **324400000018609**
 E-mail для обращений: **patokad6@gmail.com**


### 2. Какие данные могут обрабатываться

Оператор может обрабатывать только в объёме, необходимом для соответствующей цели:

1.  Telegram ID; 
2.  username Telegram; 
3.  имя и фамилию, передаваемые Telegram; 
4.  игровую статистику и прогресс; 
5.  уровень и XP Battle Pass; 
6.  сведения о заданиях, наградах и кейсах; 
7.  данные об операциях с внутриигровыми ресурсами; 
8.  данные о физических товарах и сформированных QR-кодах; 
9.  историю использования промокодов; 
10.  сведения о блокировках и зафиксированных нарушениях; 
11.  IP-адрес; 
12.  технические характеристики устройства и браузера, передаваемые в рамках обычного сетевого взаимодействия; 
13.  технические журналы, сведения об ошибках и событиях безопасности; 
14.  переписку со службой поддержки. 

Оператор намеренно не запрашивает специальные категории персональных данных, биометрические данные, паспортные данные или сведения о здоровье для обычного использования игры.

### 3. Цели обработки

Данные обрабатываются для:

— создания и идентификации игровой учётной записи;

— сохранения прогресса;

— работы Battle Pass, рейтинга, заданий, кейсов и наград;

— проведения операций получения физических товаров;

— создания и проверки QR-кодов;

— технической поддержки;

— предотвращения читов, ботов, мошенничества и обхода ограничений;

— расследования технических сбоев;

— обеспечения безопасности Сервиса;

— исполнения настоящего Соглашения;

— исполнения обязательных требований законодательства;

— анализа стабильности и качества Сервиса в обезличенной или минимально необходимой форме.

### 4. Правовые основания

Обработка осуществляется при наличии применимого законного основания, включая:

— необходимость заключения или исполнения договора с Пользователем;

— исполнение обязанностей Оператора, установленных законодательством;

— осуществление законных интересов Оператора при условии соблюдения прав субъекта;

— отдельное согласие субъекта, когда оно требуется законодательством.

### 5. Операции с данными

Оператор может осуществлять сбор, запись, систематизацию, накопление, хранение, уточнение, извлечение, использование, предоставление лицам, участвующим в обеспечении работы Сервиса, обезличивание, блокирование, удаление и уничтожение данных.

### 6. Источники данных

Данные могут поступать:

— непосредственно от Пользователя;

— от Telegram в объёме, технически передаваемом Mini App или боту;

— автоматически при работе приложения;

— из игровых действий Пользователя;

— из обращений в поддержку.

### 7. Передача третьим лицам

Персональные данные могут предоставляться технологическим исполнителям только в объёме, необходимом для работы Сервиса, например платформе обмена сообщениями, инфраструктурным/хостинговым поставщикам и иным техническим подрядчикам.

Продажа персональных данных Пользователей третьим лицам не осуществляется.

Распространение персональных данных неопределённому кругу лиц без отдельного законного основания не осуществляется.

### 8. Локализация и трансграничная передача

При сборе данных граждан Российской Федерации через Интернет Оператор соблюдает применимые требования законодательства о локализации персональных данных. Действующая ст. 18 Закона № 152-ФЗ запрещает при таком сборе первичную запись, систематизацию, накопление, хранение, уточнение и извлечение данных граждан РФ с использованием зарубежных баз данных, кроме прямо предусмотренных законом исключений. 

Трансграничная передача осуществляется только при наличии правовых оснований и после выполнения предусмотренных законом процедур. Ст. 12 Закона № 152-ФЗ предусматривает отдельное уведомление Роскомнадзора до начала такой деятельности. 


### 9. Защита данных

Оператор применяет необходимые правовые, организационные и технические меры для защиты персональных данных от неправомерного доступа, изменения, уничтожения, копирования и иных неправомерных действий. Такие меры прямо требуются ст. 19 Закона № 152-ФЗ. 

### 10. Срок хранения

Персональные данные хранятся не дольше, чем это необходимо для достижения целей обработки или исполнения требований законодательства.

Данные, необходимые для действующей учётной записи, могут храниться в течение срока её использования.

После достижения цели либо прекращения законного основания данные удаляются, уничтожаются или обезличиваются в сроки, установленные законодательством. Закон № 152-ФЗ, в частности, устанавливает ряд сроков прекращения обработки и уничтожения, включая общий срок до 30 дней в предусмотренных законом ситуациях. 

Резервные копии могут очищаться в соответствии с установленным техническим циклом хранения при условии ограничения их дальнейшего использования.

### 11. Права Пользователя

Пользователь вправе в предусмотренных законодательством случаях:

— получить сведения об обработке своих персональных данных;

— потребовать уточнения неточных данных;

— потребовать блокирования либо удаления неправомерно обрабатываемых данных;

— потребовать прекращения обработки;

— отозвать ранее данное согласие;

— обратиться в Роскомнадзор или суд для защиты своих прав.

Обращение можно направить на **patokad6@gmail.com**.

### 12. Отзыв согласия

Если конкретная обработка осуществляется на основании согласия, Пользователь вправе отозвать его путём обращения на **patokad6@gmail.com**.

Отзыв согласия не препятствует продолжению обработки тех данных, для которых после отзыва существует иное предусмотренное законодательством основание. 

### 13. Несовершеннолетние

Сервис имеет возрастную категорию 6+.

Обработка данных несовершеннолетних осуществляется с учётом требований законодательства об их дееспособности и законном представительстве.

Если в конкретной ситуации законодательство требует действие законного представителя, Оператор вправе запросить соответствующее подтверждение.

### 14. Изменение Политики

Оператор вправе изменять Политику при изменении Сервиса или применимого законодательства.

Актуальная версия размещается таким образом, чтобы Пользователь мог ознакомиться с ней через Сервис.','# PRIVACY AND PERSONAL DATA PROCESSING POLICY

## “SWEET RUN” Service

**Version dated 13 August 2026**

### 1. Operator

The personal data operator is:

**Individual Entrepreneur Olga Sergeevna Shepeleva**
TIN: **402577489644**
Primary State Registration Number of Individual Entrepreneur: **324400000018609**
E-mail for requests: **patokad6@gmail.com**

### 2. Data That May Be Processed

The Operator may process only the data necessary for the relevant purpose:

1. Telegram ID;
2. Telegram username;
3. first and last name transmitted by Telegram;
4. gameplay statistics and progress;
5. Battle Pass level and XP;
6. information about tasks, rewards and cases;
7. information about operations involving in-game resources;
8. information about physical items and generated QR codes;
9. promotional-code usage history;
10. information about restrictions and recorded violations;
11. IP address;
12. technical device and browser characteristics transmitted as part of ordinary network interaction;
13. technical logs, error information and security events;
14. communications with support.

The Operator intentionally does not request special categories of personal data, biometric data, passport data or health information for ordinary use of the game.

### 3. Purposes of Processing

Data is processed for:

— creating and identifying a game account;

— saving progress;

— operating the Battle Pass, rankings, tasks, cases and rewards;

— carrying out physical-item redemption operations;

— creating and verifying QR codes;

— technical support;

— preventing cheats, bots, fraud and circumvention of restrictions;

— investigating technical failures;

— ensuring Service security;

— performing the User Agreement;

— complying with mandatory legal requirements;

— analyzing Service stability and quality in anonymized or minimally necessary form.

### 4. Legal Bases

Processing is performed where there is an applicable lawful basis, including:

— necessity to enter into or perform a contract with the User;

— compliance with legal obligations of the Operator;

— pursuit of the Operator’s legitimate interests where permitted and subject to User rights;

— separate consent of the data subject where required by law.

### 5. Processing Operations

The Operator may collect, record, systematize, accumulate, store, update, retrieve, use, provide to persons involved in operating the Service, anonymize, block, delete and destroy data.

### 6. Data Sources

Data may be received:

— directly from the User;

— from Telegram to the extent technically transmitted to the Mini App or bot;

— automatically during operation of the application;

— from the User’s gameplay actions;

— from support requests.

### 7. Disclosure to Third Parties

Personal data may be provided to technology service providers only to the extent necessary to operate the Service, for example messaging platforms, infrastructure/hosting providers and other technical contractors.

Users’ personal data is not sold to third parties.

Personal data is not made publicly available to an indefinite group of persons without a separate lawful basis.

### 8. Localization and Cross-Border Transfers

When collecting data of citizens of the Russian Federation through the Internet, the Operator complies with applicable Russian personal-data localization requirements.

Cross-border transfers are carried out only where there is a lawful basis and after completion of procedures required by applicable law.

### 9. Data Protection

The Operator applies necessary legal, organizational and technical measures to protect personal data against unlawful access, alteration, destruction, copying and other unlawful actions.

### 10. Retention Period

Personal data is retained no longer than necessary to achieve the processing purposes or comply with legal requirements.

Data necessary for an active account may be retained for the period during which that account is used.

After the purpose is achieved or a lawful basis ceases to exist, data is deleted, destroyed or anonymized within time limits established by law.

Backup copies may be cleared according to the established technical retention cycle, provided that their further use is restricted.

### 11. User Rights

Where provided by law, the User may:

— obtain information about processing of the User’s personal data;

— request correction of inaccurate data;

— request blocking or deletion of unlawfully processed data;

— request termination of processing;

— withdraw previously given consent;

— apply to Roskomnadzor or a court to protect the User’s rights.

Requests may be sent to **patokad6@gmail.com**.

### 12. Withdrawal of Consent

Where particular processing is based on consent, the User may withdraw that consent by contacting **patokad6@gmail.com**.

Withdrawal of consent does not prevent continued processing of data for which another lawful basis remains available after withdrawal.

### 13. Minors

The Service has an age rating of 6+.

Personal data of minors is processed subject to applicable requirements concerning legal capacity and lawful representation.

Where the law requires an action by a legal representative in a particular situation, the Operator may request appropriate confirmation.

### 14. Changes to the Policy

The Operator may change this Policy when the Service or applicable law changes.

The current version is made available in a manner that allows the User to review it through the Service.

**Language notice.** The Russian version is the primary policy text. The English version is provided for convenience; where interpretation differs, the Russian text should be used to the extent permitted by law.','687bba9ab60ee35124a17806ba7904870b1a3e09d23610430d45b92cd4719433','e0531d156e2ad0210b16349094499f7560cfca6167d911306926ed8e6ff45cbd','435dd20f418603b3329dd1ab17a5e5ee619eee5341f425a547114fd235d4eee3',CAST(strftime('%s','now') AS INTEGER),'system','Built-in release','builtin_seed'
);

INSERT OR IGNORE INTO legal_document_versions(
  document_key,document_version,content_ru,content_en,sha256_ru,sha256_en,sha256_bundle,published_at,published_by,published_by_name,source
) VALUES(
  'consent','2026-08-13.1','# СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ

## сервиса «Сладкий Забег»

**Редакция от 13 августа 2026 года**

Я свободно и добровольно даю ИП Шепелевой Ольге Сергеевне, ИНН 402577489644, ОГРНИП 324400000018609, согласие на обработку моих персональных данных в объёме и для целей, указанных в Политике конфиденциальности сервиса «Сладкий Забег», в тех случаях, когда такая обработка требует моего согласия.

Согласие может охватывать Telegram ID, username, имя и фамилию Telegram, игровые данные, историю операций и QR-кодов, сведения о блокировках, IP-адрес, данные устройства и технические журналы.

Оператор вправе осуществлять сбор, запись, систематизацию, накопление, хранение, уточнение, извлечение, использование, предоставление уполномоченным техническим исполнителям, обезличивание, блокирование, удаление и уничтожение указанных данных.

Согласие действует до достижения целей обработки или до его отзыва, если иное основание обработки не предусмотрено законом. Отозвать согласие можно по адресу **patokad6@gmail.com**.','# PERSONAL DATA PROCESSING CONSENT

## “SWEET RUN” Service

**Version dated 13 August 2026**

I freely and voluntarily consent to Individual Entrepreneur Olga Sergeevna Shepeleva, TIN 402577489644, Primary State Registration Number of Individual Entrepreneur 324400000018609, processing my personal data to the extent and for the purposes described in the Privacy Policy of the “Sweet Run” Service, in those cases where such processing requires my consent.

This consent may cover Telegram ID, username, Telegram first and last name, gameplay data, transaction and QR-code history, restriction information, IP address, device data and technical logs.

The Operator may collect, record, systematize, accumulate, store, update, retrieve, use, provide data to authorized technical service providers, anonymize, block, delete and destroy the specified data.

The consent remains valid until the processing purposes are achieved or until it is withdrawn, unless another lawful basis for processing is provided by law. Consent may be withdrawn by contacting **patokad6@gmail.com**.','10bcaf97ef31fad736f5e4f987ffad94c30c964e759b72c9a49c97738ede48d7','64383734cc3469028242d0c90867ccc42c7605269b187a94056fc963460ddb41','11ebecc6978dac4f887b2ed4316f12f9ebafd4c41d5eeafed331ee12ae2948e0',CAST(strftime('%s','now') AS INTEGER),'system','Built-in release','builtin_seed'
);

-- Backfill cryptographic evidence for confirmations already stored before this migration.
INSERT OR IGNORE INTO legal_acceptance_evidence(
  telegram_id,document_key,document_version,acceptance_kind,sha256_ru,sha256_en,sha256_bundle,recorded_at
)
SELECT h.telegram_id,h.document_key,h.document_version,h.acceptance_kind,v.sha256_ru,v.sha256_en,v.sha256_bundle,h.accepted_at
FROM legal_acceptance_history h
JOIN legal_document_versions v ON v.document_key=h.document_key AND v.document_version=h.document_version;

-- Backfill the dedicated consent event log/current state from the existing acceptance history.
INSERT OR IGNORE INTO legal_consent_events(
  telegram_id,document_version,event_kind,language,event_at,ip_address,user_agent,reason,source,actor_id,actor_name,event_key
)
SELECT h.telegram_id,h.document_version,'consented',h.language,h.accepted_at,h.ip_address,h.user_agent,'','legacy_acceptance','','','legacy_accept_' || h.id
FROM legal_acceptance_history h
WHERE h.document_key='consent';

INSERT OR IGNORE INTO legal_consent_current(telegram_id,status,document_version,event_at,reason,source,actor_id,actor_name)
SELECT telegram_id,'active',consent_version,consent_accepted_at,'','legacy_acceptance','',''
FROM legal_acceptance_state
WHERE COALESCE(consent_version,'')<>'' AND COALESCE(consent_accepted_at,0)>0;
