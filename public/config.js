// KANDAKOV — ЕДИНАЯ ТОЧКА БЫСТРЫХ ИЗМЕНЕНИЙ
// Меняйте здесь контакты, цены и ссылки оплаты.
// После каждого сохранения в GitHub Cloudflare автоматически опубликует новую версию.

window.KANDAKOV = {
  brand: {
    name: "Метод Кандакова",
    site: "methodkandakov.com",
    email: "info@methodkandakov.com",
    telegramUser: "@alexandr_kandakov",
    telegramUrl: "https://t.me/alexandr_kandakov",
    inn: "352605286197",
    executor: "Кандаков Александр Александрович"
  },

  // Цена ПКЧ здесь намеренно не зафиксирована:
  // в утвержденных данных текущей рабочей точки её окончательное значение не указано.
  products: {
    pkch: {
      price: "",
      paymentUrl: ""       // вставить ссылку Prodamus после подключения
    },
    spkch: {
      price: "49 900 ₽",
      paymentUrl: ""       // вставить ссылку Prodamus
    },
    private: {
      price: "490 000 ₽"
      // публичной кнопки оплаты НЕТ — только обращение и предварительный анализ задачи
    },
    club: {
      monthPrice: "9 900 ₽/мес",
      yearPrice: "99 000 ₽/12 мес",
      monthPaymentUrl: "", // вставить рекуррентную ссылку Prodamus
      yearPaymentUrl: ""   // вставить годовую ссылку Prodamus
    }
  }
};
