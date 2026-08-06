// Общие константы и типовые блоки сайта «Пушистый Завод»
const SITE = 'https://pushistyzavod.ru';
const COMPANY = {
  name: 'Пушистый Завод',
  phone: '+7 (989) 605-10-10',
  phoneTel: '+79896051010',
  email: 'pushistyzavod@mail.ru',
  tg: 'https://t.me/pushistyzavod',
  wa: 'https://wa.me/79896051010',
  vk: 'https://vk.com/pushistyzavod',
  max: 'https://max.ru/pushistyzavod',
  legal: 'ИП Цыренов Тимур Борисович',
  inn: '031320564462',
  ogrnip: '323030000049231',
  factory: 'Республика Бурятия, г. Улан-Удэ',
  office: 'Москва (офис продаж)',
  rating: { value: 4.9, count: 57 },
};

// Кластеры → родительская страница в хлебных крошках
const PARENTS = {
  catalog:   { url: '/soft-toys.html', label: 'Мягкие игрушки' },
  plastic:   { url: '/pvc-figures.html', label: 'ПВХ-фигурки' },
  gifts:     { url: '/korporativnye-podarki/', label: 'Корпоративные подарки' },
  holidays:  { url: '/korporativnye-podarki/', label: 'Корпоративные подарки' },
  industries:{ url: '/dlya-biznesa/', label: 'Отраслевые решения' },
  services:  { url: '/production.html', label: 'Производство' },
  production:{ url: '/production.html', label: 'Производство' },
  cities:    { url: '/dostavka-po-rf/', label: 'Доставка по России' },
};

// Реальные кейсы (файлы из /prototype/images/works/) с тегами для подбора на страницы
// tags: toy, maskot, talisman, pvc, figurka, brelok, fleshka, dzhibits, magnit,
//       ny (новый год), bank, it, sport, retail, hotel, avia, med, kids, promo, zhk
const CASES = [
  { img: 'maskot-pyaterochka-300000.jpg', cap: 'Маскоты для сети «Пятёрочка»', qty: '300 000 шт', tags: ['maskot', 'retail', 'toy'] },
  { img: 'personazh-soka-dobryy-100000.jpg', cap: 'Персонаж сока «Добрый»', qty: '100 000 шт', tags: ['toy', 'promo', 'fmcg'] },
  { img: 'novogodnyaya-elka-rf-30000.jpg', cap: 'Ёлки-игрушки, федеральная акция', qty: '30 000 шт', tags: ['ny', 'toy', 'promo'] },
  { img: 'maskot-zeva-20000.jpg', cap: 'Маскот Зева для бренда', qty: '20 000 шт', tags: ['maskot', 'toy'] },
  { img: 'talisman-lokomotiv-10000.jpg', cap: 'Талисман ХК «Локомотив»', qty: '10 000 шт', tags: ['talisman', 'sport', 'toy'] },
  { img: 'maskot-dlya-bmw-10000.jpg', cap: 'Маскот для BMW', qty: '10 000 шт', tags: ['maskot', 'auto'] },
  { img: 'promo-multfilma-8000.jpg', cap: 'Игрушки к премьере мультфильма', qty: '8 000 шт', tags: ['promo', 'kids', 'toy'] },
  { img: 'personazh-iz-skazki-dlya-detey-8000.jpg', cap: 'Персонаж из сказки для детей', qty: '8 000 шт', tags: ['kids', 'toy'] },
  { img: 'simvol-goda-loshadi-rostiks-7000.jpg', cap: 'Символ года для «Ростикс»', qty: '7 000 шт', tags: ['ny', 'toy', 'fmcg'] },
  { img: 'promo-detskiy-mir-6000.jpg', cap: 'Промо-игрушки для «Детского мира»', qty: '6 000 шт', tags: ['promo', 'retail', 'kids'] },
  { img: 'abs-figurka-mindray-6000.jpg', cap: 'ABS-фигурки для Mindray', qty: '6 000 шт', tags: ['pvc', 'figurka', 'med'] },
  { img: 'personazh-iz-igry-5600.jpg', cap: 'Персонаж из видеоигры', qty: '5 600 шт', tags: ['toy', 'it'] },
  { img: 'abs-figurka-dinamo-5000.jpg', cap: 'ABS-фигурки для «Динамо»', qty: '5 000 шт', tags: ['pvc', 'figurka', 'sport'] },
  { img: 'brelok-pvh-korgi-5000.jpg', cap: 'ПВХ-брелоки «Корги»', qty: '5 000 шт', tags: ['pvc', 'brelok'] },
  { img: 'talisman-bars-4000.jpg', cap: 'Талисман Барс для клуба', qty: '4 000 шт', tags: ['talisman', 'sport'] },
  { img: 'abs-figurka-rzhd-4000.jpg', cap: 'ABS-фигурки для РЖД', qty: '4 000 шт', tags: ['pvc', 'figurka', 'logistika'] },
  { img: 'podushka-kot-marketpleysy-4000.jpg', cap: 'Подушки-коты для маркетплейса', qty: '4 000 шт', tags: ['softgoods', 'market'] },
  { img: 'talisman-avangard-3000.jpg', cap: 'Талисман ХК «Авангард»', qty: '3 000 шт', tags: ['talisman', 'sport'] },
  { img: 'personazh-aeroflot-3000.jpg', cap: 'Персонаж для «Аэрофлота»', qty: '3 000 шт', tags: ['avia', 'toy'] },
  { img: 'novogodniy-podarok-nami-3000.jpg', cap: 'Новогодние подарки для НАМИ', qty: '3 000 шт', tags: ['ny', 'gift'] },
  { img: 'brelok-pvh-yandex-3000.jpg', cap: 'ПВХ-брелоки для Яндекса', qty: '3 000 шт', tags: ['pvc', 'brelok', 'it'] },
  { img: 'brelok-pvh-lis-3000.jpg', cap: 'ПВХ-брелоки «Лис»', qty: '3 000 шт', tags: ['pvc', 'brelok'] },
  { img: 'brelok-pvh-ovechka-3000.jpg', cap: 'ПВХ-брелоки «Овечка»', qty: '3 000 шт', tags: ['pvc', 'brelok'] },
  { img: 'simvol-goda-loshad-rostiks-3000.jpg', cap: 'Лошадь — символ года', qty: '3 000 шт', tags: ['ny', 'toy'] },
  { img: 'talisman-dlya-valfox-3000.jpg', cap: 'Талисман для Valfox', qty: '3 000 шт', tags: ['talisman'] },
  { img: 'talisman-igrovogo-kluba-3000.jpg', cap: 'Талисман игрового клуба', qty: '3 000 шт', tags: ['talisman', 'it'] },
  { img: 'abs-figurka-kukolka-2500.jpg', cap: 'Коллекционные ABS-фигурки', qty: '2 500 шт', tags: ['pvc', 'figurka'] },
  { img: 'maskot-kiberprotekt-2000.jpg', cap: 'Маскот для «Киберпротект»', qty: '2 000 шт', tags: ['maskot', 'it'] },
  { img: 'maskot-kondicionerov-2000.jpg', cap: 'Маскот бренда кондиционеров', qty: '2 000 шт', tags: ['maskot', 'retail'] },
  { img: 'talisman-federacii-sportivnoy-gimnastiki-rf-3000.jpg', cap: 'Талисман федерации гимнастики РФ', qty: '3 000 шт', tags: ['talisman', 'sport', 'gos'] },
  { img: 'novogodniy-podarok-1500.jpg', cap: 'Новогодний корпоративный подарок', qty: '1 500 шт', tags: ['ny', 'gift'] },
  { img: 'moskovskiy-zoopark-cherepashka-1500.jpg', cap: 'Черепашка для Московского зоопарка', qty: '1 500 шт', tags: ['zoo', 'toy'] },
  { img: 'figurka-pvh-casino-1500.jpg', cap: 'ПВХ-фигурки для казино', qty: '1 500 шт', tags: ['pvc', 'figurka'] },
  { img: 'konfetnitsa-slon-1000.jpg', cap: 'Конфетница «Слон»', qty: '1 000 шт', tags: ['ny', 'softgoods', 'gift'] },
  { img: 'konfetnitsa-obezyanka-zoopark-1000.jpg', cap: 'Конфетница для зоопарка', qty: '1 000 шт', tags: ['ny', 'zoo', 'gift'] },
  { img: 'konfetnitsa-simvol-goda-2026-500.jpg', cap: 'Конфетница — символ 2026 года', qty: '500 шт', tags: ['ny', 'gift'] },
  { img: 'dzhinsovyy-medved-1000.webp', cap: 'Медвед в джинсе, корпоративный мерч', qty: '1 000 шт', tags: ['toy', 'merch'] },
  { img: 'figurka-pvh-botanik-1000.jpg', cap: 'ПВХ-фигурка «Ботаник»', qty: '1 000 шт', tags: ['pvc', 'figurka'] },
  { img: 'figurka-pvh-it-kompaniya-1000.jpg', cap: 'ПВХ-фигурка для IT-компании', qty: '1 000 шт', tags: ['pvc', 'figurka', 'it'] },
  { img: 'figurka-pvh-kapibara-spokoy-1000.jpg', cap: 'Капибара из ПВХ', qty: '1 000 шт', tags: ['pvc', 'figurka'] },
  { img: 'dzhibitsy-dengi-1000.jpg', cap: 'Джибитсы «Денежные»', qty: '1 000 шт', tags: ['pvc', 'dzhibits'] },
  { img: 'dzhibitsy-sport-200000.jpg', cap: 'Спортивные джибитсы', qty: '200 000 шт', tags: ['pvc', 'dzhibits', 'sport'] },
  { img: 'abs-figurka-kiberprotekt-1000.jpg', cap: 'ABS-фигурка «Киберпротект»', qty: '1 000 шт', tags: ['pvc', 'figurka', 'it'] },
  { img: 'personazh-altayskiy-bars-1000.jpg', cap: 'Алтайский барс — талисман региона', qty: '1 000 шт', tags: ['talisman', 'gos'] },
  { img: 'promo-dlya-vystavki-igr-700.jpg', cap: 'Промо к выставке игр', qty: '700 шт', tags: ['promo', 'it'] },
  { img: 'maskot-dlya-psb-800.jpg', cap: 'Маскот для ПСБ', qty: '800 шт', tags: ['maskot', 'bank'] },
  { img: 'podushka-lisichka-800.jpg', cap: 'Подушка «Лисичка»', qty: '800 шт', tags: ['softgoods'] },
  { img: 'fleshka-pvh-1xbet-800.jpg', cap: 'ПВХ-флешки для 1xBet', qty: '800 шт', tags: ['pvc', 'fleshka'] },
  { img: 'abs-figurka-tinkoff-700.jpg', cap: 'ABS-фигурки для Тинькофф', qty: '700 шт', tags: ['pvc', 'figurka', 'bank'] },
  { img: 'snezhnyy-bars-dlya-vystavki-700.jpg', cap: 'Снежный барс для выставки', qty: '700 шт', tags: ['promo', 'toy'] },
  { img: 'ryukzak-kapibara-700.jpg', cap: 'Рюкзак «Капибара»', qty: '700 шт', tags: ['softgoods', 'kids'] },
  { img: 'talisman-tc-voronezha-700.jpg', cap: 'Талисман ТЦ Воронежа', qty: '700 шт', tags: ['talisman', 'retail'] },
  { img: 'reklama-meda-promo-500.jpg', cap: 'Мед для рекламной акции', qty: '500 шт', tags: ['promo', 'fmcg'] },
  { img: 'maskot-omchik-figurnoe-katanie-rf-500.jpg', cap: 'Омчик — фигурное катание РФ', qty: '500 шт', tags: ['maskot', 'sport'] },
  { img: 'talisman-dlya-golf-kluba-500.jpg', cap: 'Талисман гольф-клуба', qty: '500 шт', tags: ['talisman', 'sport'] },
  { img: 'talisman-elitnye-kvartiry-rf-800.jpg', cap: 'Талисман элитных квартир', qty: '800 шт', tags: ['talisman', 'zhk'] },
  { img: 'talisman-kot-neft-400.jpg', cap: 'Кот-нефтяник — талисман компании', qty: '400 шт', tags: ['talisman', 'neft'] },
  { img: 'talisman-dlya-seti-oteley-400.jpg', cap: 'Талисман сети отелей', qty: '400 шт', tags: ['talisman', 'hotel'] },
  { img: 'personazh-dlya-otelya-radisson-350.jpg', cap: 'Персонаж для отеля Radisson', qty: '350 шт', tags: ['hotel', 'toy'] },
  { img: 'maskot-dlya-it-kompanii-ar-350.jpg', cap: 'Маскот для IT-компании', qty: '350 шт', tags: ['maskot', 'it'] },
  { img: 'ryukzak-bozhya-korovka-sad-300.jpg', cap: 'Рюкзаки для детского сада', qty: '300 шт', tags: ['softgoods', 'kids'] },
  { img: 'maskot-kot-300.jpg', cap: 'Маскот «Кот» для бренда', qty: '300 шт', tags: ['maskot'] },
  { img: 'fleshka-pvh-lisa-moszoopark-300.jpg', cap: 'Флешка «Лиса» для Мосзоопарка', qty: '300 шт', tags: ['pvc', 'fleshka', 'zoo'] },
  { img: 'fleshka-pvh-pingvin-okeanarium-500.jpg', cap: 'Флешка «Пингвин» для океанариума', qty: '500 шт', tags: ['pvc', 'fleshka', 'zoo'] },
  { img: 'podushka-akulenok-250.jpg', cap: 'Подушка «Акулёнок»', qty: '250 шт', tags: ['softgoods'] },
  { img: 'podushka-klubnichka-bolnitsa-500.jpg', cap: 'Подушки для больницы', qty: '500 шт', tags: ['softgoods', 'med'] },
  { img: 'maskot-mvk-500.jpg', cap: 'Маскот МВК', qty: '500 шт', tags: ['maskot', 'promo'] },
  { img: 'maskot-utka-500.jpg', cap: 'Маскот «Утка»', qty: '500 шт', tags: ['maskot'] },
  { img: 'maskot-sovushka-500.jpg', cap: 'Маскот «Совушка»', qty: '500 шт', tags: ['maskot', 'kids'] },
  { img: 'personazh-porabayki-rf-500.jpg', cap: 'Персонаж «Порабайки»', qty: '500 шт', tags: ['toy', 'gos'] },
  { img: 'abs-figurka-ezhik-500.jpg', cap: 'ABS-фигурка «Ёжик»', qty: '500 шт', tags: ['pvc', 'figurka'] },
  { img: 'abs-figurka-medved-500.jpg', cap: 'ABS-фигурка «Медведь»', qty: '500 шт', tags: ['pvc', 'figurka'] },
  { img: 'abs-figurka-popugay-500.jpg', cap: 'ABS-фигурка «Попугай»', qty: '500 шт', tags: ['pvc', 'figurka'] },
  { img: 'figurka-pvh-protezy-500.jpg', cap: 'ПВХ-фигурки для бренда протезов', qty: '500 шт', tags: ['pvc', 'figurka', 'med'] },
  { img: 'figurka-pvh-vystavka-500.jpg', cap: 'ПВХ-фигурки к выставке', qty: '500 шт', tags: ['pvc', 'figurka', 'promo'] },
  { img: 'figurka-pvh-online-prodazhi-500.jpg', cap: 'ПВХ-фигурка для онлайн-школы продаж', qty: '500 шт', tags: ['pvc', 'figurka', 'it'] },
  { img: 'maskot-dlya-emco-100.jpg', cap: 'Маскот для EMCO', qty: '100 шт', tags: ['maskot', 'it'] },
  { img: 'maskot-it-kompanii-100.jpg', cap: 'Маскот IT-компании', qty: '100 шт', tags: ['maskot', 'it'] },
  { img: 'maskot-slon-100.jpg', cap: 'Маскот «Слон»', qty: '100 шт', tags: ['maskot'] },
  { img: 'maskot-transportnaya-kompaniya-100.jpg', cap: 'Маскот транспортной компании', qty: '100 шт', tags: ['maskot', 'logistika'] },
  { img: 'robot-dlya-it-kompanii-100.jpg', cap: 'Робот для IT-компании', qty: '100 шт', tags: ['toy', 'it'] },
  { img: 'personazh-dlya-roskosmosa-strelka-100.jpg', cap: 'Стрелка для Роскосмоса', qty: '100 шт', tags: ['toy', 'gos'] },
  { img: 'talisman-donskie-sokoly-100.jpg', cap: 'Талисман «Донские соколы»', qty: '100 шт', tags: ['talisman', 'sport'] },
  { img: 'personazh-dlya-mezhdunarodnoy-vystavki-500.jpg', cap: 'Персонаж международной выставки', qty: '500 шт', tags: ['promo', 'toy'] },
  { img: 'promo-dlya-vystavki-500.jpg', cap: 'Промо-игрушки к выставке', qty: '500 шт', tags: ['promo'] },
  { img: 'abs-figurka-kollekcionnaya-500.jpg', cap: 'Коллекционная фигурка из ABS', qty: '500 шт', tags: ['pvc', 'figurka'] },
  { img: 'abs-figurka-7s-1200.jpg', cap: 'ABS-фигурки «7S»', qty: '1 200 шт', tags: ['pvc', 'figurka'] },
  { img: 'figurka-pvh-kapibara-sport-1000.jpg', cap: 'Капибара-спортсмен из ПВХ', qty: '1 000 шт', tags: ['pvc', 'figurka', 'sport'] },
  { img: 'figurka-pvh-kapibara-tancor-1000.jpg', cap: 'Капибара-танцор из ПВХ', qty: '1 000 шт', tags: ['pvc', 'figurka'] },
];

const REVIEWS = [
  { name: 'Роза', role: 'маркетинг-директор, сеть магазинов', ava: 'roza-avatar.jpg',
    text: 'Заказывали талисманы к юбилею компании — 3 000 штук. Макет согласовали за два дня, образец приехал за неделю. Качество пошива отличное, все игрушки как одна. Партия пришла точно к дате.' },
  { name: 'Лидия', role: 'HR-директор, IT-компания', ava: 'lidiya-avatar.jpg',
    text: 'Делали мерч для сотрудников: маскоты и подушки с логотипом. Ребята сами предложили улучшения по материалам, помогли с маркировкой. Коллеги до сих пор носят игрушки на рабочие места.' },
  { name: 'Оюна', role: 'руководитель проектов, агентство', ava: 'oyuna-avatar.jpg',
    text: 'Работаем с фабрикой как с производственным партнёром уже второй год. Ни разу не сорвали сроки, даже в декабрьский аврал. Документы всегда в порядке — для нас это критично.' },
  { name: 'Ариана', role: 'бренд-менеджер, FMCG', ava: 'arianka-avatar.jpg',
    text: 'Нужны были промо-игрушки к федеральной акции — 30 000 штук за полтора месяца. Сомневались, что реально. Фабрика справилась, брак меньше процента, ОТК перед отгрузкой по каждой коробке.' },
];

const STEPS_SOFT = [
  { b: 'Бриф и расчёт', p: 'Обсуждаем задачу, референсы и тираж. За 1 рабочий день присылаем смету и сроки.', t: '1 день' },
  { b: 'Дизайн и макет', p: 'Отрисовываем макет будущей игрушки, согласовываем цвета, материалы и брендирование.', t: '2–4 дня' },
  { b: 'Сигнальный образец', p: 'Шьём образец, отправляем фото и видео, при необходимости — курьером. Правим до идеала.', t: '~10 дней' },
  { b: 'Производство тиража', p: 'Раскрой, вышивка, пошив, набивка, ОТК каждой партии. Фото- и видеоотчёты с цеха.', t: '2–5 недель' },
  { b: 'Упаковка и отгрузка', p: 'Индивидуальная упаковка, маркировка «Честный знак», доставка ТК до вашего города.', t: '1–7 дней' },
];

const STEPS_PVC = [
  { b: 'Бриф и расчёт', p: 'Уточняем форму, размеры, цвета и тираж. Присылаем смету за 1 рабочий день.', t: '1 день' },
  { b: '3D-модель', p: 'Моделируем фигурку в 3D, согласовываем ракурсы и цветопередачу по Pantone.', t: '3–5 дней' },
  { b: 'Пресс-форма', p: 'Изготавливаем форму и отливаем контрольный образец для утверждения.', t: '7–12 дней' },
  { b: 'Производство тиража', p: 'Литьё, прокрас, сборка и контроль качества каждой партии.', t: '2–4 недели' },
  { b: 'Упаковка и отгрузка', p: 'Пакуем по вашим требованиям и отправляем ТК в любой город России.', t: '1–7 дней' },
];

const BENEFITS = [
  { i: '🏭', b: 'Собственная фабрика', p: 'Полный цикл в России: раскрой, пошив, литьё ПВХ, брендирование. Никаких посредников — цены производителя.' },
  { i: '✅', b: 'Сертификаты и маркировка', p: 'Сертификаты соответствия, гипоаллергенные материалы, маркировка «Честный знак» для розницы и маркетплейсов.' },
  { i: '🎯', b: 'Образец до тиража', p: 'Сначала сигнальный образец, вы утверждаете качество — потом запускаем партию. Риски равны нулю.' },
  { i: '📄', b: 'Договор и документы', p: 'Работаем с юрлицами и ИП: договор, счета, УПД, отсрочка платежа для постоянных клиентов.' },
  { i: '🚚', b: 'Доставка по всей РФ', p: 'Отгружаем в любой город: СДЭК, Деловые Линии, ПЭК, ЖелДорЭкспедиция. Страховка груза включена.' },
  { i: '⏱', b: 'Сроки в договоре', p: 'Фиксируем дату отгрузки в договоре и несём ответственность за каждый день просрочки.' },
];

const STATS = [
  { b: '500+', s: 'компаний заказали игрушки и сувениры у нашей фабрики' },
  { b: '100 000', s: 'изделий в месяц — максимальная мощность производства' },
  { b: '3–6 недель', s: 'средний срок от брифа до отгрузки готовой партии' },
  { b: '4,9 из 5', s: 'средняя оценка клиентов по качеству и срокам' },
];

const TRUST = ['Собственное производство', 'Сертификаты ЕАС', 'Маркировка «Честный знак»', 'Договор с юрлицами', 'ОТК каждой партии', 'Доставка по всей России'];

// Цены для таблиц (базовые вилки по продуктам, ₽/шт)
const PRICE_LINES = {
  toy:     { label: 'мягкая игрушка 20–25 см', prices: [[100, 690], [500, 540], [1000, 460], [3000, 390], [5000, 350], [10000, 310]] },
  mini:    { label: 'мини-игрушка / брелок 10 см', prices: [[100, 390], [500, 290], [1000, 240], [3000, 199], [5000, 179], [10000, 159]] },
  big:     { label: 'большая игрушка 40–60 см', prices: [[100, 1490], [500, 1190], [1000, 990], [3000, 890], [5000, 790], [10000, 720]] },
  maskot:  { label: 'корпоративный маскот', prices: [[100, 790], [500, 620], [1000, 540], [3000, 470], [5000, 430], [10000, 390]] },
  pvc:     { label: 'ПВХ-фигурка до 8 см', prices: [[100, 490], [500, 360], [1000, 290], [3000, 240], [5000, 210], [10000, 185]] },
  brelok:  { label: 'ПВХ-брелок', prices: [[100, 190], [500, 140], [1000, 115], [3000, 95], [5000, 85], [10000, 75]] },
  pillow:  { label: 'подушка с логотипом', prices: [[100, 590], [500, 470], [1000, 410], [3000, 360], [5000, 330], [10000, 299]] },
  gift:    { label: 'корпоративная игрушка-подарок', prices: [[100, 740], [500, 590], [1000, 510], [3000, 440], [5000, 399], [10000, 359]] },
};

const FAQ_COMMON = [
  { q: 'Какой минимальный тираж?', a: 'Минимальный тираж — 100 штук одного изделия. Для сложных маскотов и ПВХ-фигурок с пресс-формой рекомендуем от 300–500 штук: так себестоимость заметно ниже.' },
  { q: 'Сколько стоит образец?', a: 'Сигнальный образец мягкой игрушки — от 5 000 ₽, ПВХ-фигурки — от 15 000 ₽ (включая 3D-модель). При заказе тиража стоимость образца полностью вычитается из суммы договора.' },
  { q: 'Какие сроки производства?', a: 'Макет — 2–4 дня, образец — около 10 дней, тираж — 2–5 недель в зависимости от объёма и сложности. Точную дату отгрузки фиксируем в договоре.' },
  { q: 'Можно ли с логотипом компании?', a: 'Да, это наш основной формат. Наносим логотип машинной вышивкой, шелкографией, сублимацией, делаем жаккардовые бирки, нашивки и фирменную упаковку.' },
  { q: 'Есть ли сертификаты на продукцию?', a: 'Да. Материалы сертифицированы, наполнитель гипоаллергенный. Оформляем декларации соответствия ЕАС и маркировку «Честный знак» — продукция легальна для розницы и маркетплейсов.' },
  { q: 'Как происходит оплата?', a: 'Работаем по договору с юрлицами и ИП: счёт, безнал, УПД. Стандартно — 70% предоплата и 30% перед отгрузкой, для постоянных клиентов возможна отсрочка.' },
  { q: 'Доставляете в другие города?', a: 'Да, отправляем по всей России: СДЭК, Деловые Линии, ПЭК, ЖелДорЭкспедиция. Срок доставки — 1–7 дней в зависимости от города, груз застрахован.' },
  { q: 'Можно ли приехать на производство?', a: 'Да, фабрика находится в Улан-Удэ — покажем цеха, материалы и текущие тиражи. Если вы в другом городе, проведём видеоэкскурсию и отправим фотоотчёты на каждом этапе.' },
];

module.exports = { SITE, COMPANY, PARENTS, CASES, REVIEWS, STEPS_SOFT, STEPS_PVC, BENEFITS, STATS, TRUST, PRICE_LINES, FAQ_COMMON };
