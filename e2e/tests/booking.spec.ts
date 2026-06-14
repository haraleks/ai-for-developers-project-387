import { test, expect } from '@playwright/test';

// Unique suffixes to prevent test state collision
const getUniqueName = (prefix: string) => `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;

test.describe('Calendar Booking Service E2E Tests', () => {

  test('Сценарий 1: Сквозное успешное бронирование (Happy Path)', async ({ page, request }) => {
    const eventName = getUniqueName('Индивидуальная консультация (тест)');
    const eventDescription = 'Обсуждение проекта и ответы на вопросы';
    const guestName = 'Тестовый Гость';
    const guestEmail = 'guest@example.com';
    const guestComment = 'Хочу обсудить интеграционные тесты.';

    // 1. Владелец создает новый тип встречи
    await page.goto('/owner');
    await expect(page.getByRole('heading', { name: 'Кабинет владельца' })).toBeVisible();

    // Кликаем по кнопке создания нового типа
    await page.getByRole('button', { name: /Создать тип/ }).click();

    // Заполняем форму
    await page.locator('#event-name').fill(eventName);
    await page.locator('#event-duration').fill('45');
    await page.locator('#event-description').fill(eventDescription);

    // Нажимаем Сохранить
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();

    // Убеждаемся, что тип встречи появился в списке
    await expect(page.locator(`text=${eventName}`)).toBeVisible();

    // 2. Гость заходит на страницу записи и бронирует слот
    await page.goto('/guest');
    await expect(page.getByRole('heading', { name: 'Запись на встречу' })).toBeVisible();

    // Находим созданный тип встречи и выбираем его
    const eventCard = page.locator('div.rounded-xl').filter({ hasText: eventName });
    await eventCard.getByRole('button', { name: 'Выбрать время' }).click();

    // Проверяем, что отображается выбор даты
    await expect(page.getByText('Выбор даты встречи')).toBeVisible();

    // Находим первый доступный слот.
    // Слот-кнопка содержит только время в формате HH:MM, например "09:00".
    const firstSlotBtn = page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ }).first();
    await expect(firstSlotBtn).toBeVisible();
    
    const slotTime = await firstSlotBtn.innerText();
    await firstSlotBtn.click();

    // Открывается диалог подтверждения записи
    await expect(page.getByText('Подтверждение записи')).toBeVisible();

    // Заполняем контакты гостя
    await page.locator('#guest-name').fill(guestName);
    await page.locator('#guest-email').fill(guestEmail);
    await page.locator('#guest-comment').fill(guestComment);

    // Подтверждаем
    await page.getByRole('button', { name: 'Подтвердить запись' }).click();

    // Появляется экран успешного создания
    await expect(page.getByText('Запись успешно создана!')).toBeVisible();
    await expect(page.locator(`text=${eventName}`).first()).toBeVisible();
    await expect(page.locator(`text=${guestName}`).first()).toBeVisible();
    await expect(page.locator(`text=${guestEmail}`).first()).toBeVisible();
    await expect(page.locator(`text=${guestComment}`).first()).toBeVisible();

    // 3. Проверка у владельца в кабинете в списке записей
    await page.goto('/owner');
    
    // Переключаемся на вкладку "Записи"
    await page.getByRole('tab', { name: /Записи/ }).click();

    // Находим конкретную карточку записи этого гостя во вкладке "Записи"
    const bookingCard = page.locator('div.rounded-xl, div.border').filter({ hasText: guestName }).first();
    await expect(bookingCard).toBeVisible();
    await expect(bookingCard.locator(`text=${guestEmail}`)).toBeVisible();
    await expect(bookingCard.locator(`text=${guestComment}`)).toBeVisible();

    // 4. Контрольная проверка бэкенда: делаем прямой API-запрос, чтобы убедиться в сохранении в БД
    const bookingsResponse = await request.get('http://127.0.0.1:8000/owner/bookings');
    expect(bookingsResponse.ok()).toBeTruthy();
    const bookings = await bookingsResponse.json();
    
    // Ищем бронирование по уникальным признакам
    const savedBooking = bookings.find((b: any) => b.guestName === guestName && b.guestEmail === guestEmail && b.comment === guestComment);
    expect(savedBooking).toBeDefined();
    expect(savedBooking.comment).toBe(guestComment);
  });

  test('Сценарий 2: Конфликт бронирования (409 Conflict)', async ({ page, request }) => {
    const eventName = getUniqueName('Тест Конфликт');
    
    // 1. Создаем тип события напрямую на бэкенде
    const createTypeResponse = await request.post('http://127.0.0.1:8000/event-types', {
      data: {
        name: eventName,
        description: 'Слот для проверки конфликта 409',
        durationMinutes: 30
      }
    });
    expect(createTypeResponse.ok()).toBeTruthy();
    const eventType = await createTypeResponse.json();

    // 2. Получаем список слотов для этого события
    const slotsResponse = await request.get(`http://127.0.0.1:8000/event-types/${eventType.id}/slots`);
    expect(slotsResponse.ok()).toBeTruthy();
    const slots = await slotsResponse.json();
    
    // Выбираем первый свободный слот
    const availableSlots = slots.filter((s: any) => s.isAvailable);
    expect(availableSlots.length).toBeGreaterThan(0);
    const targetSlot = availableSlots[0];

    // 3. Открываем UI гостя
    await page.goto('/guest');
    const eventCard = page.locator('div.rounded-xl').filter({ hasText: eventName });
    await eventCard.getByRole('button', { name: 'Выбрать время' }).click();

    // Определяем день слота и нажимаем на него в календаре, если он не выбран по умолчанию.
    // Так как первый рабочий день автовыбирается, на всякий случай нажмем конкретный день из targetSlot
    const slotDate = new Date(targetSlot.startTime);
    const dataDayStr = slotDate.toLocaleDateString();
    
    const dayBtn = page.locator(`button[data-day="${dataDayStr}"]`).or(
      page.locator('button').filter({ hasText: new RegExp(`^${slotDate.getDate()}$`) })
    ).first();
    
    if (await dayBtn.isVisible()) {
      await dayBtn.click();
    }

    // Находим нужный слот по времени
    const slotTimeStr = slotDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const slotBtn = page.locator('button').filter({ hasText: slotTimeStr }).first();
    await expect(slotBtn).toBeVisible();
    await slotBtn.click();

    // Открывается диалог подтверждения записи в UI
    await expect(page.getByText('Подтверждение записи')).toBeVisible();
    await page.locator('#guest-name').fill('Опоздавший Гость');
    await page.locator('#guest-email').fill('late@example.com');

    // 4. Прямо перед нажатием кнопки "Подтвердить" в UI бронируем этот же слот через API (создаем конфликт)
    const apiBookingResponse = await request.post('http://127.0.0.1:8000/bookings', {
      data: {
        eventTypeId: eventType.id,
        startTime: targetSlot.startTime,
        guestName: 'Быстрый Гость',
        guestEmail: 'fast@example.com'
      }
    });
    expect(apiBookingResponse.status()).toBe(201);

    // 5. Теперь кликаем "Подтвердить запись" в UI гостя
    await page.getByRole('button', { name: 'Подтвердить запись' }).click();

    // Должна появиться ошибка конфликта (например, "Это время уже занято" или "Время начала встречи уже занято")
    // В GuestPage ошибка выводится в `formError` внутри диалога
    const errorAlert = page.locator('.text-destructive');
    await expect(errorAlert).toBeVisible();
    const errorText = await errorAlert.innerText();
    expect(errorText.toLowerCase()).toContain('занято');

    // Кнопка закрытия/отмены диалога работает и диалог остается открытым до закрытия
    await expect(page.getByText('Подтверждение записи')).toBeVisible();
  });

  test('Сценарий 3: Настройка доступности (Рабочие / Выходные дни)', async ({ page }) => {
    // 1. Открываем кабинет владельца
    await page.goto('/owner');
    
    // Переходим на вкладку "Рабочее время"
    await page.getByRole('tab', { name: 'Рабочее время' }).click();
    await expect(page.getByText('Рабочие часы и доступность')).toBeVisible();

    // Сделаем Среду (день недели 3) нерабочим днем
    // ID свитча по коду: `#working-switch-3`
    const wednesdaySwitch = page.locator('#working-switch-3');
    await expect(wednesdaySwitch).toBeVisible();

    const isChecked = await wednesdaySwitch.getAttribute('aria-checked') === 'true';
    if (isChecked) {
      // Кликаем по свитчу, чтобы сделать Среду выходным
      await wednesdaySwitch.click();
    }

    // Нажимаем "Сохранить доступность"
    await page.getByRole('button', { name: 'Сохранить доступность' }).click();
    
    // Ждем подтверждения
    await expect(page.locator('text=Изменения сохранены!')).toBeVisible();

    // 2. Открываем UI гостя и проверяем календарь
    await page.goto('/guest');

    // Создаем или находим любой доступный тип события, чтобы открыть его календарь
    // (Поскольку у нас 1 воркер и тесты идут последовательно, можем использовать любой доступный тип)
    const firstEventCard = page.locator('div.rounded-xl').first();
    await firstEventCard.getByRole('button', { name: 'Выбрать время' }).click();

    // Получаем даты ближайших сред в рамках 30-дневного окна
    const today = new Date();
    const wednesdays: Date[] = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      if (date.getDay() === 3) { // 3 - это среда
        wednesdays.push(date);
      }
    }

    // Проверяем, что кнопки этих сред заблокированы (disabled)
    for (const wednesday of wednesdays) {
      const dataDayStr = wednesday.toLocaleDateString();
      const dayBtn = page.locator(`button[data-day="${dataDayStr}"]`).or(
        page.locator('button').filter({ hasText: new RegExp(`^${wednesday.getDate()}$`) })
      ).first();

      if (await dayBtn.isVisible()) {
        await expect(dayBtn).toBeDisabled();
      }
    }

    // 3. Восстанавливаем расписание: возвращаем Среду в рабочее состояние
    await page.goto('/owner');
    await page.getByRole('tab', { name: 'Рабочее время' }).click();
    
    const wedSwitchState = await wednesdaySwitch.getAttribute('aria-checked') === 'true';
    if (!wedSwitchState) {
      await wednesdaySwitch.click();
    }
    await page.getByRole('button', { name: 'Сохранить доступность' }).click();
    await expect(page.locator('text=Изменения сохранены!')).toBeVisible();
  });

test('Сценарий 4: Таймзона владельца — отображение и смена в кабинете', async ({ page }) => {
  await page.goto('/owner');
  await expect(page.getByRole('heading', { name: 'Кабинет владельца' })).toBeVisible();

  await page.getByRole('tab', { name: 'Рабочее время' }).click();
  await expect(page.getByText('Часовой пояс владельца')).toBeVisible();

  const timezoneTrigger = page.locator('#timezone-select');
  await expect(timezoneTrigger).toContainText('Europe/Moscow');

  await timezoneTrigger.click();
  await page.locator('[role="option"]', { hasText: 'Asia/Vladivostok' }).click();
  await expect(timezoneTrigger).toContainText('Asia/Vladivostok');

  await page.getByRole('button', { name: 'Сохранить доступность' }).click();
  await expect(page.locator('text=Изменения сохранены!')).toBeVisible();

  await page.goto('/owner');
  await page.getByRole('tab', { name: 'Рабочее время' }).click();
  await expect(page.locator('#timezone-select')).toContainText('Asia/Vladivostok');

  await page.locator('#timezone-select').click();
  await page.locator('[role="option"]', { hasText: 'Europe/Moscow' }).click();
  await page.getByRole('button', { name: 'Сохранить доступность' }).click();
  await expect(page.locator('text=Изменения сохранены!')).toBeVisible();
});

test('Сценарий 5: Таймзона владельца отображается в интерфейсе гостя', async ({ page, request }) => {
  const eventName = getUniqueName('Тест таймзоны');

  const createRes = await request.post('http://127.0.0.1:8000/event-types', {
    data: { name: eventName, description: 'Проверка таймзоны', durationMinutes: 30 }
  });
  expect(createRes.ok()).toBeTruthy();
  const eventType = await createRes.json();

  await page.goto('/guest');
  const eventCard = page.locator('div.rounded-xl').filter({ hasText: eventName });
  await eventCard.getByRole('button', { name: 'Выбрать время' }).click();

  await expect(page.locator('text=Europe/Moscow').first()).toBeVisible();
  await expect(page.getByText(/часовому поясу владельца/)).toBeVisible();

  const firstSlotBtn = page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ }).first();
  await expect(firstSlotBtn).toBeVisible();
  await firstSlotBtn.click();

  await expect(page.getByText('Подтверждение записи')).toBeVisible();
  await expect(page.getByText(/Часовой пояс владельца/)).toBeVisible();
  await expect(page.locator('text=Europe/Moscow')).toBeVisible();

  await page.locator('#guest-name').fill('Гость Таймзона');
  await page.locator('#guest-email').fill('tz-guest@example.com');
  await page.getByRole('button', { name: 'Подтвердить запись' }).click();

  await expect(page.getByText('Запись успешно создана!')).toBeVisible();
  await expect(page.getByText(/Часовой пояс владельца/)).toBeVisible();
  await expect(page.locator('font-mono', { hasText: 'Europe/Moscow' })).toBeVisible();
});

});
