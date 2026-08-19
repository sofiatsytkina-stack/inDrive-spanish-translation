# Аватарки курьеров и флаг страны

Это НЕ текстовые правки — сюда словарный скрипт (03) не достаёт. Не было выполнено из-за лимита,
инструкция ниже — план действий для человека с доступом.

## Аватарки курьеров (`../../Userpics/`)

В корне проекта лежат 4 готовых фото: `Carlos.png`, `Juan.png`, `Mateo.png`, `Gaurav.png` (имя
файла — просто исходная метка, не итоговое имя персонажа в макете, см. `localization-table.csv`
за финальным маппингом имя↔фото).

Шаги:
1. Найти все узлы-фото курьера на странице Colombia — это, скорее всего, `INSTANCE` или `RECTANGLE`
   с image fill внутри карточек `cell/Controls/bid` (экран "Bids", frame `2001:18472`) и в блоках
   с назначенным курьером на экранах "Search for courier" (`2001:18212`) и "Order statuses"
   (`2001:18734`) — тех же людей вероятно нужно показать consistently через все три экрана одного
   flow (курьер найден → едет → доставляет).
2. Загрузить 4 картинки в Figma через инструмент `upload_assets` (отдельный MCP-инструмент Figma,
   не `use_figma`) — передать пути к файлам, получить image hash/ссылку на каждую.
3. В `use_figma`-скрипте применить как **override на инстансе** (НЕ трогать мастер-компонент):
   ```js
   const node = await figma.getNodeByIdAsync(AVATAR_NODE_ID);
   const imageHash = 'ХЭШ_ИЗ_upload_assets';
   const fills = JSON.parse(JSON.stringify(node.fills));
   fills[0] = { type: 'IMAGE', imageHash, scaleMode: 'FILL' };
   node.fills = fills;
   return { id: node.id };
   ```
4. Сначала найти реальные node id фото (через `get_metadata` на карточку бида — по имени слоя типа
   "Photo"/"Avatar"/"Userpic" и т.п., или через `use_figma` query `INSTANCE[name*=hoto], INSTANCE[name*=vatar]`
   внутри группы Bids/Search for courier/Order statuses).

## Флаг страны у поля телефона

Сейчас на телефонных полях (Sender's phone / Recipient's phone) стоит мексиканский флаг (видно на
скриншоте `../screenshots/order-details-filled_current-EN-state.png`). Нужно заменить на колумбийский.

Скорее всего это инстанс компонента-флага из общей библиотеки (напр. `Flag/MX` → `Flag/CO`), а не
картинка. План:
1. `search_design_system` (Figma MCP-инструмент) с запросом типа "flag" / "country flag" — найти
   компонент/вариант для Колумбии в подключённой библиотеке.
2. Если это variant-компонент (COMPONENT_SET со свойством "Country"/"Flag") — сменить
   `instance.setProperties({ Country: 'CO' })` (имя свойства уточнить через
   `componentPropertyDefinitions` родительского COMPONENT_SET).
3. Если это отдельные компоненты по странам (не варианты одного сета) — заменить
   `instance.mainComponent = COLOMBIA_FLAG_COMPONENT` (после `importComponentByKeyAsync`, если
   компонент из другого файла/библиотеки).
4. Найти все инстансы флага на странице Colombia (не только в Order details — телефон, скорее всего,
   переиспользуется в Main form, Offer и т.д.) через `page.query('INSTANCE[name*=lag]')` или по
   mainComponent.name, и применить правку ко всем разом.

Это не было проверено вживую — при первом заходе кончился месячный лимит MCP-вызовов до того, как
дошли до этого шага. Первый шаг с человеком с paid-доступом — просто прогнать
`search_design_system` и `page.query` выше и посмотреть, что реально есть в файле.
