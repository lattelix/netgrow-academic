# Стратегия тестирования NetGrow

## 1. Уровни тестирования

| Уровень | Инструмент | Что покрывает |
| --- | --- | --- |
| Модульные тесты домена | Vitest | Чистые бизнес-правила: приёмлемость заявки, авторизация, соответствие компетенций |
| Компонентные тесты | Vitest + Testing Library | Базовые интерактивные UI-примитивы (кнопка, состояния загрузки/ошибки/пусто/запрета) |
| Интеграционные тесты API и БД | Vitest + локальный PostgreSQL (`TEST_DATABASE_URL`) | Атомарность решения и отзыва заявки, откат (через PL/pgSQL-триггер), повторное решение, вместимость под реальной конкуренцией и авторизация; плюс регрессия доступа к календарю |
| Сквозные (e2e) тесты | Playwright | Полный сценарий защиты и минимум один запрещённый сценарий мутации |
| Статическая проверка | `tsc --noEmit`, ESLint | Типобезопасность и стиль кода |
| Сборка | `next build` | Работоспособность production-сборки |

## 2. Трассировка требований на тесты

| Требование | Тест |
| --- | --- |
| ФТ-05, ФТ-06 (применимость и дублирование заявки) | `src/lib/domain/__tests__/eligibility.test.ts` |
| ФТ-09 (решение по заявке только при статусе pending) | `eligibility.test.ts` → `canDecideApplication`; `e2e/defense-workflow.spec.ts` |
| ФТ-09, ФТ-10 (решение, команда и журнал в одной транзакции) | `src/lib/domain/__tests__/decision-route.test.ts` |
| ФТ-10 (формирование команды при одобрении) | `e2e/defense-workflow.spec.ts` («organizer opens the resulting team workspace…») |
| ФТ-11, безопасность (владение проектом) | `src/lib/domain/__tests__/authorization.test.ts`; `e2e/forbidden-mutation.spec.ts` |
| ФТ-13, ФТ-14 (задачи, назначение, статус) | `e2e/defense-workflow.spec.ts` |
| ФТ-16 (аналитика) | `e2e/defense-workflow.spec.ts` («…organizer analytics reflect the change») |
| ФТ-17 (администрирование, только admin) | `e2e/forbidden-mutation.spec.ts` («participant cannot access administration») |
| НФТ-02, НФТ-03 (доступность, состояния) | `src/components/ui/__tests__/States.test.tsx`, `Button.test.tsx` |
| Соответствие компетенций (алгоритм) | `src/lib/domain/__tests__/fit.test.ts` |
| Авторизация на уровне API (403 для чужой роли) | `e2e/forbidden-mutation.spec.ts` («the API rejects a participant…») |

## 3. Реально выполненные команды и результаты

Все команды выполнены из корня проекта после `pnpm install` и запечатлены построчно —
результаты ниже соответствуют фактическому прогону, а не ожидаемому поведению.

### 3.1. Lint

```
pnpm lint
```

Результат: **0 ошибок, 0 предупреждений** (после устранения двух первоначальных
предупреждений `@typescript-eslint/no-unused-vars` и лишней `eslint-disable`-директивы).

### 3.2. Типизация

```
pnpm typecheck
```

Результат: **успешно, без ошибок** (строгий режим TypeScript, `tsc --noEmit`).

### 3.3. Модульные и компонентные тесты

```
TEST_DATABASE_URL=postgresql://localhost/netgrow_test pnpm test
```

Результат на 01.10.2026: **8 файлов, 48 тестов, все пройдены**.
Онлайн-редакция проверяется на реальном локальном PostgreSQL. Интеграционные тесты
проверяют фиксацию и откат решения, вместимость при конкурирующих запросах,
повторное решение и запрет доступа. Отдельные проверки календаря охватывают три роли.
Защитные проверки не позволяют тестам сбрасывать облачную или основную локальную базу.

### 3.4. Производственная сборка

```
pnpm build
```

Результат: **production-сборка выполнена успешно** (Next.js 16, Turbopack), ошибок типов и
линтинга при сборке не обнаружено.

### 3.5. Сквозные тесты (Playwright)

```
pnpm e2e
```

Результат: **10 из 10 тестов пройдены** на Chromium:

1. `participant explores profile and catalog, submits an application`
2. `organizer reviews the queue and approves the application`
3. `organizer opens the resulting team workspace and assigns a task`
4. `participant sees the updated dashboard and organizer analytics reflect the change`
5. `participant cannot access administration`
6. `participant cannot access the organizer application queue`
7. `an organizer cannot edit a project owned by another organizer`
8. `an organizer cannot list applications for another organizer's project`
9. `a participant cannot read another team's workspace through the API`
10. `the API rejects a participant attempting to approve an application`

Тесты 1–4 воспроизводят полный сценарий защиты «участник → организатор → команда →
обновлённый дашборд и аналитика» на изолированной базе данных
(`netgrow_e2e` на локальном PostgreSQL, пересоздаётся в `e2e/global-setup.ts` перед
прогоном; адрес выводится из `DATABASE_URL`). Тесты 5–10 проверяют требование «Playwright покрывает минимум один запрещённый
сценарий мутации», фактически покрывая шесть независимых случаев отказа в доступе: доступ к
административному разделу, доступ к очереди чужих заявок, редактирование чужого проекта,
получение списка заявок по чужому проекту (организатор не видит заявки к проектам, которыми
не владеет), чтение рабочего пространства чужой команды напрямую через API (посторонний
авторизованный пользователь не получает данные чужой команды) и прямое изменение статуса
заявки участником в обход интерфейса.

## 4. Известные ограничения тестового покрытия

### Дополнительный прогон 02.10.2026

После исправлений аудита пройдены **92 теста в 11 файлах**, typecheck, lint,
production-сборка и **14 сценариев Playwright**. Добавлены тесты прямого чтения API,
ролевых выборок аналитики/журнала/календаря и отката бизнес-мутаций при реальном сбое
журнала. Отчёт и точная область проверки: [`audit-2026-10-02.md`](audit-2026-10-02.md).

- Репозитории заявок, команд и журнала действий покрыты интеграционными тестами обработчика
  решения на PostgreSQL. Остальные репозитории не выделены в отдельные модульные тесты и
  проверяются через сквозные сценарии.
- Нагрузочное и защитное (security) автоматизированное тестирование не выполнялось —
  это осознанно вне периметра учебного стенда (см. `security.md`, раздел
  production-рекомендаций).
