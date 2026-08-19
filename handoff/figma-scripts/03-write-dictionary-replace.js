/*
ГЛАВНЫЙ скрипт записи правок. Идея: вместо того чтобы редактировать 1379 нод по одной, строим
JS-словарь {английская строка -> испанская колумбийская строка} из localization-table.csv
(см. ../localization-table.csv) и одним проходом по всем TEXT-нодам страницы Colombia меняем те,
чьё текущее содержимое совпадает с ключом словаря.

ВАЖНО:
- Числовая клавиатура (0-9, ABC/DEF/... группы букв, "* #", ".", "+") и экранная QWERTY-клавиатура
  (буквы Q-M с надстрочными цифрами, "?123", ",", "English", ".") — это системные компоненты клавиатур,
  НЕ переводим. В словарь их не добавляем — тогда скрипт их просто не тронет.
- Если в ноде смешано форматирование (напр. частично bold/цветной фрагмент внутри одной текстовой
  ноды) — после loadFontAsync по каждому уникальному шрифту в ноде можно смело делать
  node.characters = newValue: это применит стиль первого символа ко всей новой строке. Для меню
  цены на карточках ставок ("$17" зелёным) это не проблема — там весь текст в ноде одного цвета,
  просто у самой ноды/инстанса есть булево свойство типа "highlighted", которое красит целиком.
- Скрипт НЕ трогает узлы типа COMPONENT/COMPONENT_SET (пропускает их) — это safety-check, чтобы
  случайно не изменить мастер-компонент, который может быть общим с другими страницами/файлом.
- Разбивайте DICTIONARY на части и гоняйте в несколько вызовов (напр. по 100-150 записей), чтобы
  не упереться в SSE-обрыв на большом return. Сам словарь в коде может быть большим (лимит на code —
  50000 символов), проблема именно в размере RETURN, так что в конце верните только count + errors,
  не список всех id (или верните id, но короткий список).
*/

const DICTIONARY = {
  // Заполнить из localization-table.csv (колонки English -> Colombia).
  // Пример нескольких готовых записей (уже переведено и подтверждено референсом UI Examples/Colombia.png):
  "Save": "Guardar",
  "Accept": "Aceptar",
  "Decline": "Rechazar",
  "Cancel request": "Cancelar solicitud",
  "Clothes": "Ropa",
  "Flowers": "Flores",
  "Food": "Comida",
  "Documents": "Documentos",
  "Desserts": "Postres",
  "Pharmacy": "Farmacia",
  "Car courier": "En carro",
  "Foot courier": "A pie",
  "Bike": "En bicicleta",
  // ... добавить остальные ~390 строк из localization-table.csv
};

const page = await figma.getNodeByIdAsync('2001:14595');
await figma.setCurrentPageAsync(page);

const nodes = page.findAllWithCriteria({ types: ['TEXT'] });
const changed = [];
const errors = [];

for (const node of nodes) {
  const current = node.characters;
  if (!Object.prototype.hasOwnProperty.call(DICTIONARY, current)) continue;
  const next = DICTIONARY[current];
  if (next === current) continue;

  try {
    // canonical recipe: load every font actually used in this node, then mutate
    const segments = node.getStyledTextSegments(['fontName']);
    const fonts = new Set(segments.map(s => JSON.stringify(s.fontName)));
    for (const f of fonts) {
      await figma.loadFontAsync(JSON.parse(f));
    }
    node.characters = next;
    changed.push(node.id);
  } catch (e) {
    errors.push({ id: node.id, current, error: String(e) });
  }
}

return { changedCount: changed.length, errorCount: errors.length, errors: errors.slice(0, 20) };

/* ============================================================================================
   ДОПОЛНЕНИЕ (после сессии, где Colombia была доведена до конца) — два реальных гэтчи, с которыми
   столкнулись, и готовый код для их починки. Пригодится при повторении на Peru/Ecuador.
   ============================================================================================ */

/* --------------------------------------------------------------------------------------------
   1) Bids card fixes — точечные правки по id, НЕ через общий DICTIONARY.
   Почему не через словарь: карточки ставок на экране Bids используют переиспользуемые компоненты
   с плейсхолдер-значениями (машина/цена/имя/время/расстояние/рейтинг/счётчик), и одно и то же
   английское значение может быть на карточках, которые в реальном референсе должны получить РАЗНЫЕ
   финальные числа/имена у разных курьеров. Поэтому правим по конкретному node id, а не по exact
   text match.

   На Colombia (2001:14595) нашлось 3 "шаблона" карточки:
   - Card A (car)   -> Carlos : id-префиксы "I2001:18514" и "I2001:18680"
   - Card B (moto)  -> изначально было "María" (нарушает правило "только мужские имена курьеров") ->
                       переименовано в Mateo : id-префиксы "I2001:18515" и "I2001:18681"
   - Card C (car, Mercedes-Benz) -> изначально дубль "Mateo" -> переименовано в Juan (чтобы не было
                       повтора имени) : id-префиксы "I2001:18516", "I2001:18517", "I2001:18682"

   Суффиксы одного шаблона (общие для всех вариантов): 148928=машина, 148917=цена, 148925=имя,
   148924=время, 148919=расстояние, 148920=счётчик "(215)" и т.п., 148921=рейтинг "4,9".

   На Peru/Ecuador после дублирования страницы id БУДУТ ДРУГИМИ — сначала найти карточки заново:
   frame.query('INSTANCE[name=Avatar]') внутри группы Bids, затем у родителя каждого инстанса
   посмотреть соседние TEXT-ноды с именами "#Car.1", "#Price.1", "#Name.1", "#Time.1",
   "#Distance.1" (это literal layer names — искать через .query('TEXT[name=#Name.1]') и т.п. внутри
   родителя карточки).
-------------------------------------------------------------------------------------------- */
async function fixBidsCards(fileKeyPageId) {
  const page = await figma.getNodeByIdAsync(fileKeyPageId); // '2001:14595' на Colombia
  await figma.setCurrentPageAsync(page);

  const FIXES = [];
  function addCard(prefix, fields) {
    for (const [suffix, value] of Object.entries(fields)) {
      FIXES.push({ id: `${prefix};3149:${suffix}`, next: value });
    }
  }

  // ПРИМЕР для Colombia — для Peru/Ecuador подставить свои id (см. выше) и значения из таблицы
  // референс-скриншотов в README.md
  for (const prefix of ["I2001:18514", "I2001:18680"]) {
    addCard(prefix, {
      "148928": "Chevrolet Onix Gris",
      "148917": "COP 13.500",
      "148925": "Carlos",
      "148924": "~12 min",
      "148919": "3,4 km",
      "148920": "(215)",
      "148921": "4,9",
    });
  }
  for (const prefix of ["I2001:18515", "I2001:18681"]) {
    addCard(prefix, {
      "148928": "Bajaj Pulsar 200 Negra",
      "148917": "COP 9.500",
      "148925": "Mateo",
      "148924": "~13 min",
      "148919": "2,1 km",
      "148920": "(340)",
      "148921": "4,9",
    });
  }
  for (const prefix of ["I2001:18516", "I2001:18517", "I2001:18682"]) {
    FIXES.push({ id: `${prefix};3149:148925`, next: "Juan" });
  }

  const changed = [];
  const errors = [];
  for (const fix of FIXES) {
    try {
      const node = await figma.getNodeByIdAsync(fix.id);
      if (!node) { errors.push({ id: fix.id, error: 'not found' }); continue; }
      const segments = node.getStyledTextSegments(['fontName']);
      const fonts = new Set(segments.map(s => JSON.stringify(s.fontName)));
      for (const f of fonts) await figma.loadFontAsync(JSON.parse(f));
      node.characters = fix.next;
      changed.push({ id: fix.id, next: fix.next });
    } catch (e) {
      errors.push({ id: fix.id, error: String(e).slice(0, 150) });
    }
  }
  return { totalFixes: FIXES.length, changedCount: changed.length, errorCount: errors.length, errors };
}

/* --------------------------------------------------------------------------------------------
   2) Hidden Unicode fixes — несколько строк в исходном английском тексте содержат невидимые
   символы (U+00A0 неразрывный пробел, U+2028 line separator) вместо обычного пробела. Обычное
   `DICTIONARY["Pickup in ~8 min"]` их НЕ находит, т.к. `node.characters !== "Pickup in ~8 min"`
   побайтово (там реально NBSP). Хуже того: печатать эти символы литералом в коде ненадёжно — они
   могут "нормализоваться" в обычный пробел при наборе. Решение — собирать строку через
   String.fromCharCode.

   Сначала обязательно просканировать страницу на такие символы (иначе не узнать, есть ли они и
   сколько): см. код детектора ниже. На Colombia нашлось 7 узлов / 4 уникальных строки:
-------------------------------------------------------------------------------------------- */
async function findHiddenUnicodeIssues(pageId) {
  const page = await figma.getNodeByIdAsync(pageId);
  await figma.setCurrentPageAsync(page);
  const nodes = page.findAllWithCriteria({ types: ['TEXT'] });
  const oddChars = ['00A0','2000','2001','2002','2003','2004','2005','2006','2007','2008','2009',
    '200A','2028','2029','200B','200C','200D','FEFF','202F','2060','000B','000C','0085'];
  const oddPattern = new RegExp('[' + oddChars.map(h => '\\u' + h).join('') + ']');
  const found = nodes.filter(n => oddPattern.test(n.characters));
  const seen = new Set();
  const unique = [];
  for (const n of found) {
    if (seen.has(n.characters)) continue;
    seen.add(n.characters);
    unique.push({ id: n.id, text: n.characters, codePoints: Array.from(n.characters).map(c => c.codePointAt(0).toString(16)) });
  }
  return { totalNodesWithOddChars: found.length, uniqueOddStrings: unique.length, unique };
}

async function fixHiddenUnicodeIssues(pageId) {
  const NBSP = String.fromCharCode(0x00A0);
  const LSEP = String.fromCharCode(0x2028);

  const page = await figma.getNodeByIdAsync(pageId);
  await figma.setCurrentPageAsync(page);
  const nodes = page.findAllWithCriteria({ types: ['TEXT'] });

  // Известные на Colombia строки с "битым" пробелом — если те же исходные фразы встречаются на
  // Peru/Ecuador (до перевода на эти рынки), они будут содержать те же скрытые символы:
  const DICTIONARY = new Map();
  DICTIONARY.set(NBSP + "Enter your route", " Ingresa tu ruta");
  DICTIONARY.set("20 Molodezhnaya St" + LSEP + "Flat 15, 4th floor, intercom doesn't work, call me when you get here",
    "Calle 26 # 68-90, apto. 15, piso 4, el citófono no funciona, llámame cuando llegues");
  DICTIONARY.set("43/3 Sarikopodshipnikovaia St" + LSEP + "Flat 17, 4th floor, intercom 17",
    "Carrera 24 # 68-15, apto. 17, piso 4, citófono 17");
  DICTIONARY.set("Good day! Would you please be so kind as" + NBSP + "to take my huge surprise box to the esteemed members of my gorgeous family? I would be most grateful for it",
    "¡Buen día! ¿Serías tan amable de llevar mi caja sorpresa grande a los miembros de mi hermosa familia? Te lo agradecería mucho");
  DICTIONARY.set("Order will be delivered in " + LSEP + "~25 min", "El pedido se entregará en ~25 min");
  DICTIONARY.set("Did the courier pick up the" + NBSP + "package at your door?", "¿El mensajero recogió el paquete en tu puerta?");
  DICTIONARY.set("Pickup in ~8" + NBSP + "min", "Recogida en ~8 min");
  // Если на Peru/Ecuador всплывут ДРУГИЕ строки с odd-символами (проверить через
  // findHiddenUnicodeIssues выше), добавить их сюда тем же приёмом — построить ключ из кусков
  // текста + String.fromCharCode(0xXXXX), не печатать символ напрямую.

  const changed = [];
  const errors = [];
  for (const node of nodes) {
    const current = node.characters;
    if (!DICTIONARY.has(current)) continue;
    try {
      const segments = node.getStyledTextSegments(['fontName']);
      const fonts = new Set(segments.map(s => JSON.stringify(s.fontName)));
      for (const f of fonts) await figma.loadFontAsync(JSON.parse(f));
      node.characters = DICTIONARY.get(current);
      changed.push(node.id);
    } catch (e) {
      errors.push({ id: node.id, error: String(e).slice(0, 150) });
    }
  }
  return { changedCount: changed.length, errorCount: errors.length, errors };
}
