/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  const { discount, sale_price, quantity } = purchase;

  const discountRate = discount / 100;
  const fullPrice = sale_price * quantity;
  const revenue = fullPrice * (1 - discountRate);

  return revenue;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  const { profit } = seller;

  if (index === 0) {
    return profit * 0.15;
  }

  if (index === 1 || index === 2) {
    return profit * 0.1;
  }

  if (index === total - 1) {
    return 0;
  }

  return profit * 0.05;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records) ||
    data.sellers.length === 0 ||
    data.products.length === 0 ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }

  // @TODO: Проверка наличия опций
  if (!options || typeof options !== "object") {
    throw new Error("Не переданы функции расчета");
  }

  const { calculateRevenue, calculateBonus } = options;

  if (typeof calculateRevenue !== "function") {
    throw new Error("Не передана функция расчета выручки");
  }

  if (typeof calculateBonus !== "function") {
    throw new Error("Не передана функция расчета бонусов");
  }

  // @TODO: Подготовка промежуточных данных для сбора статистики
  const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  // @TODO: Индексация продавцов и товаров для быстрого доступа
  const sellerIndex = {};
  const productIndex = {};

  sellerStats.forEach((seller) => {
    sellerIndex[seller.id] = seller;
  });

  data.products.forEach((product) => {
    productIndex[product.sku] = product;
  });

  // @TODO: Расчет выручки и прибыли для каждого продавца
  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];

    // Один чек = одна продажа
    seller.sales_count += 1;

    // Общая выручка продавца
    seller.revenue += record.total_amount;

    // Перебираем все товары в чеке
    record.items.forEach((item) => {
      const product = productIndex[item.sku];

      // Себестоимость проданного количества товара
      const cost = product.purchase_price * item.quantity;

      // Фактическая выручка от товара с учётом скидки
      const revenue = calculateRevenue(item, product);

      // Прибыль = выручка - себестоимость
      const profit = revenue - cost;

      // Накапливаем прибыль продавца
      seller.profit += profit;

      // Если этот товар ещё не встречался у продавца,
      // создаём для него счётчик
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }

      // Добавляем количество проданных единиц товара
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  // @TODO: Сортировка продавцов по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);

  // @TODO: Назначение премий на основе ранжирования
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, sellerStats.length, seller);

    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({
        sku,
        quantity,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  // @TODO: Подготовка итоговой коллекции с нужными полями
  return sellerStats.map((seller) => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),
  }));
}
