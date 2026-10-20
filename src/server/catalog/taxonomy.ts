export const TAG_GROUPS = [
  { code: "fruit", name: "Фруктовые" },
  { code: "berry", name: "Ягодные" },
  { code: "citrus", name: "Цитрусовые" },
  { code: "sweet", name: "Сладкие и десертные" },
  { code: "fresh", name: "Свежие и мятные" },
  { code: "spice", name: "Пряные" },
  { code: "sour", name: "Кислые" },
  { code: "drink", name: "Напитки" },
  { code: "tobacco", name: "Табачные" },
] as const;

export const TAGS = [
  ["apple", "Яблоко", "fruit"],
  ["pear", "Груша", "fruit"],
  ["peach", "Персик", "fruit"],
  ["mango", "Манго", "fruit"],
  ["pineapple", "Ананас", "fruit"],
  ["banana", "Банан", "fruit"],
  ["kiwi", "Киви", "fruit"],
  ["melon", "Дыня", "fruit"],
  ["watermelon", "Арбуз", "fruit"],
  ["grape", "Виноград", "fruit"],
  ["coconut", "Кокос", "fruit"],
  ["apricot", "Абрикос", "fruit"],
  ["pomegranate", "Гранат", "fruit"],
  ["papaya", "Папайя", "fruit"],
  ["feijoa", "Фейхоа", "fruit"],
  ["strawberry", "Клубника", "berry"],
  ["raspberry", "Малина", "berry"],
  ["blueberry", "Черника", "berry"],
  ["blackberry", "Ежевика", "berry"],
  ["currant", "Смородина", "berry"],
  ["cherry", "Вишня", "berry"],
  ["cranberry", "Клюква", "berry"],
  ["wild-strawberry", "Земляника", "berry"],
  ["bird-cherry", "Черёмуха", "berry"],
  ["lemon", "Лимон", "citrus"],
  ["orange", "Апельсин", "citrus"],
  ["grapefruit", "Грейпфрут", "citrus"],
  ["lime", "Лайм", "citrus"],
  ["mandarin", "Мандарин", "citrus"],
  ["yuzu", "Юзу", "citrus"],
  ["vanilla", "Ваниль", "sweet"],
  ["caramel", "Карамель", "sweet"],
  ["chocolate", "Шоколад", "sweet"],
  ["honey", "Мёд", "sweet"],
  ["cream", "Крем", "sweet"],
  ["cookie", "Печенье", "sweet"],
  ["toffee", "Ириска", "sweet"],
  ["nougat", "Нуга", "sweet"],
  ["praline", "Пралине", "sweet"],
  ["mint", "Мята", "fresh"],
  ["menthol", "Ментол", "fresh"],
  ["eucalyptus", "Эвкалипт", "fresh"],
  ["pine", "Хвоя", "fresh"],
  ["aloe", "Алоэ", "fresh"],
  ["cinnamon", "Корица", "spice"],
  ["ginger", "Имбирь", "spice"],
  ["cardamom", "Кардамон", "spice"],
  ["anise", "Анис", "spice"],
  ["pepper", "Перец", "spice"],
  ["sour-note", "Кислинка", "sour"],
  ["barberry", "Барбарис", "sour"],
  ["rhubarb", "Ревень", "sour"],
  ["cola", "Кола", "drink"],
  ["coffee", "Кофе", "drink"],
  ["tea", "Чай", "drink"],
  ["lemonade", "Лимонад", "drink"],
  ["mojito", "Мохито", "drink"],
  ["cocoa", "Какао", "drink"],
  ["tobacco-leaf", "Табак", "tobacco"],
  ["burley", "Берли", "tobacco"],
  ["virginia", "Вирджиния", "tobacco"],
  ["cigar", "Сигара", "tobacco"],
] as const;

export const TOBACCO_BRANDS = [
  "Альтаир",
  "Галечный берег",
  "Дымок севера",
  "Еловая поляна",
  "Жар-уголь",
  "Заречье",
  "Иволга",
  "Каменный сад",
  "Ласточка",
  "Невская волна",
  "Островок",
  "Полярная сова",
  "Ремесло",
  "Северная верфь",
  "Туман и уголь",
  "Уральский клён",
  "Хвойный край",
  "Цвет граната",
  "Шёлковый дым",
  "Эхо степи",
  "Южный причал",
  "Янтарный цех",
  "Алый контур",
  "Берег тумана",
  "Кедровый двор",
  "Ночная бухта",
  "Тихая гавань",
  "Лунная тропа",
];

export const LIQUID_BRANDS = [
  "Аэро линия",
  "Белый пар",
  "Волна 12",
  "Градиент",
  "Дальнее поле",
  "Ёмкость",
  "Жидкий север",
  "Залив",
  "Иней",
  "Капля",
  "Лёгкий контур",
  "Мгла",
  "Нить пара",
  "Облачный цех",
  "Пар и лист",
  "Роса",
  "Синтез вкуса",
  "Туманный флакон",
  "Утренний пар",
  "Флакон и Ко",
  "Холодный свет",
  "Цвет пара",
  "Чистый контур",
  "Штиль",
  "Эфир лаборатория",
  "Южный флакон",
];

export type FilterParam = "strength" | "pack" | "nicotineType";

export type AttributeField = {
  key: string;
  label: string;
  hardFilter: boolean;
  filterParam: FilterParam;
  options: { value: string; label: string }[];
};

export type CategorySeed = {
  code: string;
  name: string;
  sortOrder: number;
  fields: AttributeField[];
  weights: { tagWeight: number; attributeWeight: number };
};

const strength = [
  { value: "light", label: "Лёгкая" },
  { value: "medium", label: "Средняя" },
  { value: "strong", label: "Крепкая" },
];

const packs = [
  { value: "25", label: "25 г" },
  { value: "50", label: "50 г" },
  { value: "100", label: "100 г" },
  { value: "200", label: "200 г" },
];

const nicotine = [
  { value: "0", label: "0 мг" },
  { value: "3", label: "3 мг" },
  { value: "6", label: "6 мг" },
  { value: "12", label: "12 мг" },
  { value: "20", label: "20 мг" },
];

const nicotineTypes = [
  { value: "classic", label: "Классический" },
  { value: "salt", label: "Солевой" },
];

const volumes = [
  { value: "10", label: "10 мл" },
  { value: "30", label: "30 мл" },
  { value: "60", label: "60 мл" },
  { value: "100", label: "100 мл" },
];

export const CATEGORIES: CategorySeed[] = [
  {
    code: "hookah_tobacco",
    name: "Табак для кальяна",
    sortOrder: 0,
    weights: { tagWeight: 1, attributeWeight: 0 },
    fields: [
      {
        key: "strength",
        label: "Крепость",
        hardFilter: true,
        filterParam: "strength",
        options: strength,
      },
      {
        key: "packGrams",
        label: "Фасовка",
        hardFilter: true,
        filterParam: "pack",
        options: packs,
      },
    ],
  },
  {
    code: "liquid",
    name: "Жидкости",
    sortOrder: 1,
    weights: { tagWeight: 1, attributeWeight: 0 },
    fields: [
      {
        key: "nicotineStrength",
        label: "Крепость никотина",
        hardFilter: true,
        filterParam: "strength",
        options: nicotine,
      },
      {
        key: "nicotineType",
        label: "Тип никотина",
        hardFilter: true,
        filterParam: "nicotineType",
        options: nicotineTypes,
      },
      {
        key: "volumeMl",
        label: "Объём",
        hardFilter: true,
        filterParam: "pack",
        options: volumes,
      },
    ],
  },
];

export function categoryByCode(code: string) {
  return CATEGORIES.find((item) => item.code === code) ?? null;
}

export function tagByCode(code: string) {
  return TAGS.find((item) => item[0] === code) ?? null;
}

export function groupName(code: string) {
  return TAG_GROUPS.find((item) => item.code === code)?.name ?? code;
}
