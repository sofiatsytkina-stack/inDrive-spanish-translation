# Как пользоваться этими скриптами

Все скрипты ниже — готовый JavaScript для инструмента `use_figma` официального Figma MCP-сервера
(`mcp__fe213dd3-0607-406a-b57d-c07edbd20158__use_figma` в Claude Code / любой MCP-клиент с этим сервером).

**Перед первым вызовом `use_figma` обязательно нужно подтянуть skill `figma-use`** (в Claude Code — просто
передать `skillNames: "figma-use"` в вызов use_figma; правила см. в самом MCP-сервере, `get_figma_skill`
с uri `skill://figma/figma-use/SKILL.md`). Главные правила оттуда, которые уже учтены в скриптах ниже:

1. `figma.currentPage` сбрасывается на первую страницу в начале КАЖДОГО вызова `use_figma` — поэтому
   каждый скрипт сам делает `await figma.setCurrentPageAsync(page)` в начале.
2. Один вызов `use_figma` должен переключать страницу **не более одного раза**. Если нужно работать
   с несколькими страницами — это отдельные параллельные вызовы, не цикл внутри одного скрипта.
3. Любая правка текста: **сначала `loadFontAsync` на текущий шрифт ноды → `await` → потом меняем
   `characters`**. Иначе ошибка `Cannot write to node with unloaded font`.
4. Используйте `return`, а не `console.log` — видно будет только то, что вернули.
5. **Ключевая проблема, с которой мы столкнулись**: у этого конкретного MCP-сервера (транспорт SSE)
   ответы больше ~20-28 КБ обрываются ошибкой `Failed to parse SSE message ... EOF while parsing a string`.
   Это НЕ ошибка лимита — это обрыв стрima на большом ответе. Держите каждый `return` в скрипте
   компактным (десятки объектов, не сотни), дробите работу на чанки.
6. **Реальный жёсткий лимит**: на Figma Starter-плане — **20 вызовов `use_figma`/`get_metadata`/
   `get_screenshot` и т.п. В МЕСЯЦ** (плюс 10/минуту, но месячный лимит гораздо жёстче). Сбрасывается
   вместе с биллинг-циклом аккаунта. Это причина, по которой инвентаризация не была закончена в первом
   заходе — см. `../README.md`. **Экономьте вызовы**: на человеке с paid-доступом лучше сразу делать
   route "инвентаризация чанками → собрать словарь → 3-5 вызовов записи" вместо десятков мелких проверок.

## ⚠️ Какой fileKey использовать

Исходный файл (`2GDDIA8sTmlAARXtukZ6eB`, ссылка ниже) — аккаунт видит его только **View**-доступом
(team "inDrive", Starter-план); правки туда падают с `Can't set "characters" in read-only mode`.
Реальная работа (Colombia уже готова) идёт в **дубликате** на Pro-плане пользователя:

- Рабочий `fileKey`: **`b9dUHSlJ3Lt5HlVdn0V5s4`**
  (https://www.figma.com/design/b9dUHSlJ3Lt5HlVdn0V5s4/Delivery-Product-Flow-Espanol--Copy-)
- Node id **идентичны** исходнику (Figma сохранила их при Duplicate) — все id ниже актуальны для
  обоих файлов, просто подставляйте нужный `fileKey`.
- Всегда проверяйте `whoami` перед началом работы; если снова `read-only mode` — используете не тот
  `fileKey`.

## Ключевые ID (файл https://www.figma.com/design/2GDDIA8sTmlAARXtukZ6eB/Delivery-Product-Flow-Espanol — структура идентична рабочей копии)

- `fileKey` исходника (только чтение): `2GDDIA8sTmlAARXtukZ6eB`
- `fileKey` рабочей копии (Editor-доступ): `b9dUHSlJ3Lt5HlVdn0V5s4`
- Страница English (не трогать!): `0:1`
- Страница Colombia: `2001:14595`
- Секция "Delivery Hub" на странице Colombia: `2001:14596`
- 7 групп экранов (топ-фреймы внутри Delivery Hub), слева направо по x:
  | Группа | frame id |
  |---|---|
  | Entry points | `2001:14598` |
  | Main form | `2001:15440` |
  | Order details | `2001:15691` |
  | Offer | `2001:17945` |
  | Search for courier | `2001:18212` |
  | Bids | `2001:18472` |
  | Order statuses | `2001:18734` |

Важно: "Entry points" — это не только точки входа в доставку, там весь home screen супераппа inDrive
(Ride/Courier/City to city/Freight, Market, история поездок, side menu и т.д.) — переводить нужно и это тоже,
раз оно физически лежит на странице Colombia.
