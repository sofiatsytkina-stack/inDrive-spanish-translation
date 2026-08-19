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
