# Модель данных NetGrow

Схема реализована в `src/lib/db/schema.sql` (SQLite). Диаграмма ниже отражает
фактически созданные таблицы, ключи и ограничения.

## 1. ER-диаграмма

```mermaid
erDiagram
  ROLES ||--o{ USERS : "назначена"
  SHIFTS ||--o{ USERS : "прикреплён"
  SHIFTS ||--o{ PROJECTS : "проводится в рамках"
  SHIFTS ||--o{ EVENTS : "включает"
  USERS ||--o{ USER_COMPETENCIES : "владеет"
  COMPETENCIES ||--o{ USER_COMPETENCIES : "указана у"
  COMPETENCIES ||--o{ PROJECT_COMPETENCIES : "требуется в"
  USERS ||--o{ PROJECTS : "организует"
  PROJECTS ||--o{ PROJECT_COMPETENCIES : "требует"
  PROJECTS ||--o{ APPLICATIONS : "получает"
  USERS ||--o{ APPLICATIONS : "подаёт"
  PROJECTS ||--o| TEAMS : "формирует"
  TEAMS ||--o{ TEAM_MEMBERS : "включает"
  USERS ||--o{ TEAM_MEMBERS : "состоит"
  TEAMS ||--o{ TASKS : "содержит"
  USERS ||--o{ TASKS : "назначен на"
  TEAMS ||--o{ EVENTS : "участвует в"
  USERS ||--o{ ACTIVITY_LOG : "инициирует"

  ROLES {
    integer id PK
    text code UK "participant|organizer|admin"
    text name
  }

  SHIFTS {
    text id PK
    text name
    text code UK
    text start_date
    text end_date
    text status "planned|active|completed"
  }

  USERS {
    text id PK
    text full_name
    text email UK
    integer role_id FK
    text shift_id FK
    text age_group "9-11|12-14|15-17|null"
    text bio
    text avatar_color
  }

  COMPETENCIES {
    text id PK
    text name UK
    text category
    text description
  }

  USER_COMPETENCIES {
    text id PK
    text user_id FK
    text competency_id FK
    integer level "1..5"
  }

  PROJECTS {
    text id PK
    text title
    text description
    text direction
    text age_group "9-11|12-14|15-17|any"
    text status "draft|recruiting|in_progress|completed|archived"
    text shift_id FK
    text organizer_id FK
    integer capacity
  }

  PROJECT_COMPETENCIES {
    text id PK
    text project_id FK
    text competency_id FK
    integer min_level "1..5"
  }

  APPLICATIONS {
    text id PK
    text project_id FK
    text applicant_id FK
    text status "pending|approved|rejected|withdrawn"
    text message
    text decision_note
    text decided_by FK
    text decided_at
  }

  TEAMS {
    text id PK
    text project_id FK, UK
    text name
  }

  TEAM_MEMBERS {
    text id PK
    text team_id FK
    text user_id FK
    text role_in_team "lead|member"
  }

  TASKS {
    text id PK
    text team_id FK
    text title
    text description
    text assignee_id FK
    text status "todo|in_progress|done"
    text due_date
    text created_by FK
  }

  EVENTS {
    text id PK
    text shift_id FK
    text team_id FK
    text title
    text event_type "training|rehearsal|meeting|performance|other"
    text starts_at
    text ends_at
    text location
    text created_by FK
  }

  ACTIVITY_LOG {
    text id PK
    text actor_id FK
    text action
    text entity_type
    text entity_id
    text metadata "JSON"
    text created_at
  }
```

## 2. Описание сущностей

| Сущность | Назначение | Ключевые ограничения |
| --- | --- | --- |
| `roles` | Справочник ролей | `code` уникален, ограничен `CHECK` тремя значениями |
| `shifts` | Смены лагеря | `code` уникален |
| `users` | Пользователи (все роли) | `email` уникален, `role_id` обязателен, `age_group` ограничен `CHECK` |
| `competencies` | Справочник компетенций | `name` уникален |
| `user_competencies` | Компетенции участника с уровнем 1–5 | `UNIQUE(user_id, competency_id)` |
| `projects` | Проекты | `capacity > 0`, `status`/`age_group` ограничены `CHECK` |
| `project_competencies` | Требуемые компетенции проекта | `UNIQUE(project_id, competency_id)` |
| `applications` | Заявки на участие | Частичный уникальный индекс `uq_applications_active` — не более одной активной (`pending`/`approved`) заявки на пару (проект, участник) |
| `teams` | Команда проекта | `project_id` уникален — у проекта не более одной команды |
| `team_members` | Состав команды | `UNIQUE(team_id, user_id)` |
| `tasks` | Задачи команды | `status` ограничен `CHECK`, `assignee_id` может быть пустым |
| `events` | Мероприятия смены | Может быть привязано к команде (`team_id`) или быть общим для смены |
| `activity_log` | Журнал действий | Хранит только идентификаторы и служебные метаданные, без персональных секретов |

## 3. Индексы

Индексы созданы на всех внешних ключах и часто фильтруемых полях (`projects.status`,
`projects.direction`, `applications.status`, `tasks.status`, `activity_log.entity_type,
entity_id`, `events.starts_at`) — см. полный список в `src/lib/db/schema.sql`.

## 4. Целостность на уровне приложения

Помимо ограничений БД, доменный слой (`src/lib/domain/eligibility.ts`) дополнительно
проверяет вместимость команды и возрастное соответствие перед созданием заявки — это
защищает от гонок между проверкой на клиенте и фактическим состоянием базы данных, так как
финальная проверка всегда выполняется на сервере непосредственно перед записью.
