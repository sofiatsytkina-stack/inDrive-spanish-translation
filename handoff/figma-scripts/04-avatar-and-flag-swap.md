# Аватарки курьеров и флаг страны — статус после сессии на Colombia

## Флаг — ✅ готово (Colombia), метод отличается от изначального плана

Изначальный план (искать `flags / CO` через `search_design_system` / variant-свойство) **не
сработал**: `flags / MX` в файле — компонент из библиотеки, которая **отвязалась при дублировании
файла в другую команду** (`mainComponent.remote === true`, но ни `search_design_system`, ни
`get_libraries` эту библиотеку не находят — её просто нет среди подключённых). Импортировать
`flags / CO` неоткуда.

**Рабочее решение** — не завязываться на библиотеку вообще, а перестроить иконку вручную:

1. `instance.detachInstance()` — **обязательно первым шагом**. Без этого `x`/`y`/`resize()` на
   детях инстанса падают с `This property cannot be overridden in an instance: relative-transform`
   (fills менять можно и без detach, а вот позицию/размер — нет).
2. Удалить всех детей детач-нутого фрейма (`for (const c of [...frame.children]) c.remove()`) —
   изначальная структура (`Mask`-прямоугольники, `Rectangle 2`, `Oval 5` boolean-операции для герба)
   заточена под конкретный флаг (Mexico: вертикальные зелёный/белый/красный + орёл в центре) и не
   переиспользуется для горизонтальных флагов без гербов.
3. Настроить сам фрейм: `resize(24, 24)`, `clipsContent = true`, `cornerRadius = 3`, белая заливка-подложка.
4. Добавить 3 `figma.createRectangle()` нужных цветов/пропорций (см. таблицу в `../README.md`,
   раздел "Флаг") и `appendChild` их во фрейм.
5. Повторить для всех инстансов флага на странице (на Colombia — 12 штук, искать через
   `page.query('INSTANCE[name*=lag], INSTANCE[name*=Flag]')`).

Полный рабочий код (адаптировать цвета под нужную страну):
```js
const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page);

const FLAG_INSTANCE_IDS = [ /* все id инстансов "flags / MX" на этой странице */ ];

const COLOR_A = { r: 1, g: 0.807, b: 0.086 };   // жёлтый (Colombia/Ecuador верхняя полоса)
const COLOR_B = { r: 0, g: 0.235, b: 0.635 };   // синий
const COLOR_C = { r: 0.808, g: 0.106, b: 0.180 }; // красный
// Peru: только красный (COLOR_C) и белый {r:1,g:1,b:1}, полосы ВЕРТИКАЛЬНЫЕ, см. ниже.

const results = [];
for (const id of FLAG_INSTANCE_IDS) {
  const instanceNode = await figma.getNodeByIdAsync(id);
  const detached = instanceNode.detachInstance();
  for (const c of [...detached.children]) c.remove();

  detached.resize(24, 24);
  detached.clipsContent = true;
  detached.cornerRadius = 3;
  detached.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

  // --- горизонтальные полосы (Colombia/Ecuador): 24 шир. x 8/4/4 выс., накладываются сверху вниз
  const top = figma.createRectangle();
  top.resize(24, 8); top.x = 0; top.y = 4;
  top.fills = [{ type: 'SOLID', color: COLOR_A }];
  detached.appendChild(top);

  const mid = figma.createRectangle();
  mid.resize(24, 4); mid.x = 0; mid.y = 12;
  mid.fills = [{ type: 'SOLID', color: COLOR_B }];
  detached.appendChild(mid);

  const bot = figma.createRectangle();
  bot.resize(24, 4); bot.x = 0; bot.y = 16;
  bot.fills = [{ type: 'SOLID', color: COLOR_C }];
  detached.appendChild(bot);

  // --- ВЕРТИКАЛЬНЫЕ полосы (Peru): раскомментировать вместо блока выше, 3 равные полосы по ширине
  // const left = figma.createRectangle();
  // left.resize(8, 24); left.x = 0; left.y = 0;
  // left.fills = [{ type: 'SOLID', color: COLOR_C }]; // красный
  // detached.appendChild(left);
  // const center = figma.createRectangle();
  // center.resize(8, 24); center.x = 8; center.y = 0;
  // center.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; // белый
  // detached.appendChild(center);
  // const right = figma.createRectangle();
  // right.resize(8, 24); right.x = 16; right.y = 0;
  // right.fills = [{ type: 'SOLID', color: COLOR_C }]; // красный
  // detached.appendChild(right);

  results.push({ id, newId: detached.id, ok: true });
}
return results;
```

Проверить результат: `await node.screenshot({ scale: 8 })` на одном из `newId` — должен быть чистый
флаг без остатков старой графики.

## Аватарки курьеров — ❌ заблокировано, не проблема методологии

**Не сделано на Colombia** из-за сетевого ограничения текущего окружения (Claude Code agent proxy):
`upload_assets` требует самостоятельного `POST` байтов картинки на выданный `submitUrl`, а прямой
доступ к `mcp.figma.com` из `Bash` в этой среде **заблокирован политикой egress** (`403` на
`CONNECT`, подтверждено через `curl -sS "$HTTPS_PROXY/__agentproxy/status"` —
`recentRelayFailures` показывает `connect_rejected` для `mcp.figma.com:443`). Согласно
`/root/.ccr/README.md`, такие 403 — **организационная политика, обходить не пытаться**, а сообщить
пользователю (что и было сделано).

**Если у нового исполнителя другое окружение** (не через Claude Code agent proxy) — просто
попробуйте `upload_assets` + `curl --data-binary @file.png <submitUrl>` вживую, ограничение может
не действовать.

Файлы фото уже лежат в репозитории на ветке `main` (не в рабочей ветке!):
```bash
git show origin/main:Carlos.png > /tmp/Carlos.png
git show origin/main:Juan.png   > /tmp/Juan.png
git show origin/main:Mateo.png  > /tmp/Mateo.png
# Gaurav.png тоже есть, но не нужен — хватает троих (Carlos/Juan/Mateo)
```

### Если сеть доступна — план (не проверен вживую, но должен работать)

1. Найти все нужные image-rect ноды внутри инстансов аватарок:
   ```js
   const rects = avatarInstance.findAllWithCriteria({ types: ['RECTANGLE'] })
     .filter(r => r.fills && r.fills.length && r.fills[0].type === 'IMAGE');
   ```
   На Colombia пути (для справки, на Peru/Ecuador id будут другими):
   - Carlos: `I2001:18514;3149:148926;43090:20304;15:164`, `I2001:18680;...;15:164`
   - Mateo (Bids): `I2001:18515;...;15:163`, `I2001:18681;...;15:163`
   - Juan: `I2001:18516;...;15:173`, `I2001:18517;...;15:173`, `I2001:18682;...;15:173`
   - Отдельно: аватарка на экране "Order statuses" (`2001:19087`, имя `.Avatar M 65`) — это **тоже
     отвязанный библиотечный компонент** (как флаг было), `children: []`, контент не подгружается.
     Придётся так же `detachInstance()`, но т.к. там нужна ИМИДЖ-заливка (не геометрия), после
     detach просто создать `RECTANGLE`/`ELLIPSE` нужного размера с image fill вместо попытки найти
     существующий вложенный узел.

2. Загрузить 3 файла:
   ```js
   // через MCP-инструмент upload_assets (не use_figma!):
   // upload_assets({ fileKey, count: 3 }) -> 3 submitUrl
   ```
   ```bash
   curl -X POST "$SUBMIT_URL_1" -H "Content-Type: image/png" --data-binary @Carlos.png
   curl -X POST "$SUBMIT_URL_2" -H "Content-Type: image/png" --data-binary @Mateo.png
   curl -X POST "$SUBMIT_URL_3" -H "Content-Type: image/png" --data-binary @Juan.png
   ```
   Ответ каждого содержит `imageHash`.

3. Применить `imageHash` на КАЖДОМ найденном image-rect (один и тот же хэш можно переиспользовать
   на нескольких id одного человека — не нужно грузить файл повторно):
   ```js
   const rect = await figma.getNodeByIdAsync(RECT_ID);
   const fills = JSON.parse(JSON.stringify(rect.fills));
   fills[0] = Object.assign({}, fills[0], { imageHash: 'ХЭШ_ИЗ_upload_assets' });
   rect.fills = fills;
   ```

4. Для узла `2001:19087` (Order statuses, после detach) — вместо шага 3 создать новый `RECTANGLE`
   размером с исходный инстанс (48×64 судя по `width/height` инстанса), `appendChild` в детач-нутый
   фрейм, и на нём уже установить fill с `imageHash` Mateo.

### Если сеть по-прежнему недоступна

Попросите пользователя вручную подставить фото в Figma UI (drag & drop картинки на слой, или
"Paste to replace" после копирования картинки в буфер) — на Colombia так и было решено сделать в
итоге. После того как пользователь сделает это на Colombia, для Peru/Ecuador **не нужно повторно
загружать файлы** — можно скопировать `imageHash` с уже готового Colombia-инстанса тем же кодом, что
в шаге 3 (прочитать `colombiaRect.fills[0].imageHash`, применить на Peru/Ecuador rect).
