МИР ЗЕФФИ: РАЗРЕШЕНИЕ СТРОИТЕЛЬСТВА ДЛЯ ЗАКРЫТОГО RC
13.10.2026

Это безопасный конфигурационный патч (только wrangler.jsonc):
  - keep_vars=true сохраняет переменные Worker, настроенные в Cloudflare Dashboard,
    при будущих обновлениях через ./update.sh.
  - Не делает WORLD_ENABLED=true и не раскрывает WORLD_TESTER_IDS.
  - Не меняет Worker, UI, экономику, миграции, цены или сохранения D1.

ВАЖНО: ПАТЧ САМ ПО СЕБЕ НЕ ВКЛЮЧАЕТ ПОКУПКИ.
Поскольку флаги покупок намеренно контролируются удалённой конфигурацией,
их нужно включить в Cloudflare Worker `zefirok-run` > Settings > Variables and Secrets:

  WORLD_PURCHASES_ENABLED=true               (здания, дороги, участки, ускорения)
  WORLD_COMMUNITY_FUND_ENABLED=true           (состояние общего фонда)
  WORLD_COMMUNITY_CONTRIBUTIONS_ENABLED=true  (платные взносы в общий фонд)

Оставить в прежнем состоянии:
  WORLD_ENABLED=true (если закрытый RC уже доступен)
  WORLD_TESTER_IDS   (не менять, не добавлять посторонних)
  WORLD_STORY_ENABLED (если настроен, должен быть true для общего сюжета)

Если указанные флаги уже созданы как Variables, измените их значение на true.
Если они созданы как Secrets, обновите Secret, не создавая дубликат переменной.
Не заменяйте и не удаляйте другие переменные. Для таких изменений нужны права
Cloudflare администратора; этот ZIP не имеет удалённого доступа к Cloudflare.

ПРОВЕРКИ:
  git status --short
  unzip -o "$HOME/Downloads/Mir_Zeffi_RC_Purchases_Config_20261013.zip" -d .
  node -e "const f=require('fs');const c=JSON.parse(f.readFileSync('wrangler.jsonc','utf8'));if(c.keep_vars!==true)process.exit(1);console.log('keep_vars OK')"
  node scripts/check-world-rc-gate.mjs
  node scripts/check-zeffi-world-integration.mjs
  node scripts/check-production-gate.mjs --skip-d1
  git diff --check

После всех проверок:
  git add wrangler.jsonc
  git diff --cached --check
  git commit -m "Preserve Cloudflare RC access and purchase flags across deploys"
  git push origin main
  ./update.sh

Указанные три значения в Cloudflare измените на true после установки конфигурации
(либо перед следующим штатным деплоем, если точно знаете тип настроек).
После включения проверьте на разрешённом игроке платную покупку одного домика,
участка, нового сегмента дороги, ускорение и небольшой взнос в общий фонд.
Баланс должен изменяться ровно один раз, а объекты сохраняться после перезапуска.

Если срочно необходимо закрыть весь World, WORLD_ENABLED=false остаётся аварийным
серверным выключателем. Если нужно остановить только покупки, верните
WORLD_PURCHASES_ENABLED=false в Cloudflare (а отдельно фонд —
WORLD_COMMUNITY_CONTRIBUTIONS_ENABLED=false).

Если при покупке видите WORLD_PURCHASES_DISABLED, проверьте точное значение
WORLD_PURCHASES_ENABLED на активной версии Worker.
Если WORLD_PROFILE_NOT_READY или другой код — причина иная, не обходите
server-authoritative gates и не заменяйте их клиентской оплатой.

Проверка реальной конфигурации удалённого Worker и публикация не выполнены.
