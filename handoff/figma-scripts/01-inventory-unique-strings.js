/*
Цель: получить оставшиеся уникальные строки страницы Colombia (уже известно: 1379 текстовых нод,
404 уникальных значения; получены индексы [100:200) из отсортированного списка — см.
../raw-data/unique-strings-page-wide.json). Нужно дособрать [0:100) и [200:404).

Каждый вызов use_figma — это ОДИН такой скрипт с изменённым .slice(start, end).
Держите чанк на 50 элементов (не 100 — на 100 уже ловили обрыв SSE на длинных строках).
Можно слать несколько таких вызовов ПАРАЛЛЕЛЬНО в одном сообщении (это не залезает в правило
"one page switch per call", т.к. каждый вызов свою страницу переключает ровно один раз).

Пример вызова (5 параллельных чанков разом покрывают всё, что осталось):
  slice(0, 50), slice(50, 100), slice(200, 250), slice(250, 300), slice(300, 350), slice(350, 404)
*/

const page = await figma.getNodeByIdAsync('2001:14595');
await figma.setCurrentPageAsync(page);
const nodes = page.findAllWithCriteria({ types: ['TEXT'] });
const set = new Set();
for (const n of nodes) set.add(n.characters);
const sorted = Array.from(set).sort();

// ЗАМЕНИТЬ границы на нужный чанк перед каждым вызовом:
return sorted.slice(0, 50);
