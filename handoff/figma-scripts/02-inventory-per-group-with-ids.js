/*
Цель: получить ПОЛНЫЙ список {id, name, characters} для одной группы экранов — нужен, когда
словарного replace (см. 03) недостаточно и нужно править конкретную ноду по id (напр. неоднозначные
дубли строк типа "$7" которые должны стать РАЗНЫМИ цифрами в разных местах).

Уже полностью получены (см. ../raw-data/): Entry points, Main form, Offer.
НЕ получены (упали на SSE-обрыве при первой попытке ДО того как кончился месячный лимит): Search for
courier (2001:18212), Bids (2001:18472), Order statuses (2001:18734).
Частично получено: Order details (2001:15691) — только первые ~230 из 591 нод, см.
../raw-data/inventory-order-details-PARTIAL.json.

Для больших групп (Order details, Bids и т.д.) НЕ гоняйте весь фрейм разом — дробите по дочерним
фреймам (см. get_metadata на группу, чтобы узнать id вложенных экранов) или добавьте .slice() на
результат query(), чанками по ~40-60 нод.
*/

const GROUP_FRAME_ID = '2001:18212'; // <-- подставить нужный id из таблицы в 00-setup-notes.md

const page = await figma.getNodeByIdAsync('2001:14595');
await figma.setCurrentPageAsync(page);
const frame = await figma.getNodeByIdAsync(GROUP_FRAME_ID);
const texts = frame.query('TEXT').values(['id', 'name', 'characters']);

// Если результат слишком большой (>~150 нод) — раскомментировать и дробить чанками:
// return texts.slice(0, 60);

return { frameId: GROUP_FRAME_ID, count: texts.length, texts };
